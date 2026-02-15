const EventEmitter = require('events');

const BG_PHASE = {
    HERO_PICK: 'HERO_PICK',
    RECRUIT: 'RECRUIT',
    COMBAT: 'COMBAT',
    GAME_OVER: 'GAME_OVER',
};

/**
 * Battlegrounds game state engine.
 * Tracks 8 players, boards, tavern tier, HP, combat results.
 */
class BgState extends EventEmitter {
    constructor(cardDatabase) {
        super();
        this.cardDatabase = cardDatabase;
        this.reset();
    }

    reset() {
        this.state = {
            phase: BG_PHASE.HERO_PICK,
            turn: 0,
            turnStartTime: null,
            gameStartTime: null,
            localPlayerId: 0,

            // 8 players indexed by playerId
            players: new Map(),

            // Hero selection (up to 4 heroes offered)
            heroChoices: [],

            // Local player's recruit phase info
            recruit: {
                gold: 0,
                maxGold: 0,
                tavernMinions: [],  // Minions offered in Bob's Tavern
                handMinions: [],    // Minions bought but not placed
                board: [],          // Minions on board (up to 7)
                frozen: false,
            },

            // Combat info
            combat: {
                opponentPlayerId: 0,
                opponentBoard: [],
                result: null, // 'WIN' | 'LOSS' | 'TIE'
                damage: 0,
            },

            // Last known boards for each opponent
            lastSeenBoards: new Map(), // playerId -> board snapshot
        };
    }

    processEvent(event) {
        switch (event.type) {
            case 'TAG_CHANGE':
                this._handleTagChange(event);
                break;
            case 'FULL_ENTITY':
                this._handleFullEntity(event);
                break;
            case 'SHOW_ENTITY':
                this._handleShowEntity(event);
                break;
            case 'BLOCK_START':
                this._handleBlockStart(event);
                break;
        }
    }

    _handleTagChange(event) {
        const { tag, value, entityId, entityName, playerId } = event;

        // Tavern tier
        if (tag === 'PLAYER_TECH_LEVEL') {
            const tier = parseInt(value) || 1;
            const player = this._getOrCreatePlayer(playerId || this._findPlayerByEntity(entityId));
            if (player) {
                player.tavernTier = tier;
                this._emitState();
            }
        }

        // HP tracking
        if (tag === 'DAMAGE' && entityId) {
            const pid = this._findPlayerByEntity(entityId);
            const player = this._getOrCreatePlayer(pid);
            if (player) {
                player.damage = parseInt(value) || 0;
                player.hp = player.maxHp - player.damage;
                if (player.hp <= 0) player.alive = false;
                this._emitState();
            }
        }

        if (tag === 'HEALTH' && entityId) {
            const pid = this._findPlayerByEntity(entityId);
            const player = this._getOrCreatePlayer(pid);
            if (player) {
                player.maxHp = parseInt(value) || 40;
                player.hp = player.maxHp - (player.damage || 0);
                this._emitState();
            }
        }

        // Turn tracking
        if (tag === 'TURN') {
            this.state.turn = parseInt(value) || 0;
            this.state.turnStartTime = Date.now();
            // BG turns: odd = recruit, even = combat (roughly)
            this._emitState();
        }

        // Next opponent
        if (tag === 'NEXT_OPPONENT_PLAYER_ID') {
            this.state.combat.opponentPlayerId = parseInt(value) || 0;
            this._emitState();
        }

        // Player elimination (PLAYSTATE = LOST for a BG player)
        if (tag === 'PLAYSTATE' && value === 'LOST') {
            const pid = playerId || this._findPlayerByEntity(entityId);
            const player = this.state.players.get(pid);
            if (player) {
                player.alive = false;
                player.placement = this._calculatePlacement();
                this._emitState();
            }

            // If local player lost → game over
            if (pid === this.state.localPlayerId) {
                this.state.phase = BG_PHASE.GAME_OVER;
                const placement = this._calculatePlacement();
                const localPlayer = this.state.players.get(this.state.localPlayerId);
                this.emit('bgGameEnd', {
                    placement,
                    hero: localPlayer?.heroCardId || '',
                    heroName: localPlayer?.heroName || '',
                    tavernTier: localPlayer?.tavernTier || 1,
                    turns: this.state.turn,
                    duration: Date.now() - (this.state.gameStartTime || Date.now()),
                    timestamp: Date.now(),
                });
                this._emitState();
            }
        }

        // Won the whole game
        if (tag === 'PLAYSTATE' && value === 'WON') {
            const pid = playerId || this._findPlayerByEntity(entityId);
            if (pid === this.state.localPlayerId) {
                this.state.phase = BG_PHASE.GAME_OVER;
                const localPlayer = this.state.players.get(this.state.localPlayerId);
                this.emit('bgGameEnd', {
                    placement: 1,
                    hero: localPlayer?.heroCardId || '',
                    heroName: localPlayer?.heroName || '',
                    tavernTier: localPlayer?.tavernTier || 1,
                    turns: this.state.turn,
                    duration: Date.now() - (this.state.gameStartTime || Date.now()),
                    timestamp: Date.now(),
                });
                this._emitState();
            }
        }

        // Gold resources
        if (tag === 'RESOURCES') {
            if (this._isLocalPlayer(playerId || this._findPlayerByEntity(entityId))) {
                this.state.recruit.gold = parseInt(value) || 0;
                this._emitState();
            }
        }

        if (tag === 'RESOURCES_USED') {
            if (this._isLocalPlayer(playerId || this._findPlayerByEntity(entityId))) {
                const max = this.state.recruit.maxGold || 10;
                this.state.recruit.gold = max - (parseInt(value) || 0);
                this._emitState();
            }
        }

        // Freeze tavern
        if (tag === 'BACON_FROZEN') {
            this.state.recruit.frozen = value === '1';
            this._emitState();
        }
    }

    _handleFullEntity(event) {
        // Detect hero cards during hero pick phase
        if (event.cardId && event.zone === 'HAND' &&
            this.state.phase === BG_PHASE.HERO_PICK) {
            const card = this.cardDatabase?.getCard(event.cardId);
            if (card && card.type === 'HERO') {
                this.state.heroChoices.push({
                    cardId: event.cardId,
                    entityId: event.entityId,
                    name: card.name || event.cardId,
                });
                this._emitState();
            }
        }

        // Track minion entities for board reconstruction
        if (event.cardId && event.playerId) {
            const card = this.cardDatabase?.getCard(event.cardId);
            if (card && card.type === 'MINION') {
                this._trackMinion(event, card);
            }
        }
    }

    _handleShowEntity(event) {
        // Opponent minions revealed during combat
        if (event.cardId) {
            const card = this.cardDatabase?.getCard(event.cardId);
            if (card && card.type === 'MINION') {
                // Store as opponent board snapshot
                const combatOpponent = this.state.combat.opponentPlayerId;
                if (combatOpponent && !this._isLocalPlayer(event.playerId)) {
                    const boardSnapshot = this.state.lastSeenBoards.get(combatOpponent) || [];
                    if (!boardSnapshot.some((m) => m.entityId === event.entityId)) {
                        boardSnapshot.push({
                            entityId: event.entityId,
                            cardId: event.cardId,
                            name: card.name || '',
                            attack: card.attack || 0,
                            health: card.health || 0,
                            tier: card.techLevel || 0,
                            tribe: card.race || '',
                            keywords: this._extractKeywords(card),
                        });
                        this.state.lastSeenBoards.set(combatOpponent, boardSnapshot);
                        this._emitState();
                    }
                }
            }
        }
    }

    _handleBlockStart(event) {
        if (!event.blockType) return;

        if (event.blockType === 'BACON_HERO_PICK') {
            this.state.phase = BG_PHASE.HERO_PICK;
            this.state.gameStartTime = Date.now();
        } else if (event.blockType === 'BACON_BOARD' || event.blockType === 'BACON_SHOP') {
            this.state.phase = BG_PHASE.RECRUIT;
        } else if (event.blockType === 'BACON_COMBAT') {
            this.state.phase = BG_PHASE.COMBAT;
            // Clear opponent board for new snapshot
            const opId = this.state.combat.opponentPlayerId;
            if (opId) this.state.lastSeenBoards.set(opId, []);
        }
        this._emitState();
    }

    // ── Player Management ──────────────────────────────

    setLocalPlayer(playerId) {
        this.state.localPlayerId = playerId;
    }

    _getOrCreatePlayer(playerId) {
        if (!playerId) return null;
        if (!this.state.players.has(playerId)) {
            this.state.players.set(playerId, {
                playerId,
                heroCardId: '',
                heroName: '',
                hp: 40,
                maxHp: 40,
                damage: 0,
                tavernTier: 1,
                alive: true,
                placement: 0,
                lastCombatResult: null,
                lastCombatDamage: 0,
            });
        }
        return this.state.players.get(playerId);
    }

    _findPlayerByEntity(entityId) {
        if (!entityId) return null;
        for (const [playerId, player] of this.state.players) {
            if (player.entityId === entityId) {
                return playerId;
            }
        }
        return null;
    }

    _isLocalPlayer(playerId) {
        return playerId && playerId === this.state.localPlayerId;
    }

    _calculatePlacement() {
        let alive = 0;
        for (const p of this.state.players.values()) {
            if (p.alive) alive++;
        }
        return alive + 1; // Placement = alive players + 1 (just eliminated)
    }

    // ── Minion Tracking ────────────────────────────────

    _trackMinion(event, card) {
        const minion = {
            entityId: event.entityId,
            cardId: event.cardId,
            name: card.name || '',
            attack: card.attack || 0,
            health: card.health || 0,
            tier: card.techLevel || 0,
            tribe: card.race || '',
            keywords: this._extractKeywords(card),
        };

        if (this._isLocalPlayer(event.playerId)) {
            if (event.zone === 'PLAY') {
                const board = this.state.recruit.board;
                if (!board.some((m) => m.entityId === minion.entityId)) {
                    if (board.length < 7) board.push(minion);
                }
            } else if (event.zone === 'HAND') {
                this.state.recruit.handMinions.push(minion);
            }
        }
    }

    _extractKeywords(card) {
        const keywords = [];
        if (card.mechanics) {
            for (const m of card.mechanics) {
                if (['TAUNT', 'DIVINE_SHIELD', 'POISONOUS', 'WINDFURY',
                    'DEATHRATTLE', 'BATTLECRY', 'REBORN', 'AVENGE',
                    'START_OF_COMBAT', 'VENOMOUS'].includes(m)) {
                    keywords.push(m);
                }
            }
        }
        return keywords;
    }

    // ── State Access ───────────────────────────────────

    getState() {
        const playersArray = [];
        for (const p of this.state.players.values()) {
            playersArray.push({ ...p });
        }
        playersArray.sort((a, b) => b.hp - a.hp);

        const boardSnapshots = {};
        for (const [pid, board] of this.state.lastSeenBoards) {
            boardSnapshots[pid] = [...board];
        }

        return {
            phase: this.state.phase,
            turn: this.state.turn,
            turnStartTime: this.state.turnStartTime,
            localPlayerId: this.state.localPlayerId,
            players: playersArray,
            heroChoices: [...this.state.heroChoices],
            recruit: { ...this.state.recruit },
            combat: { ...this.state.combat },
            lastSeenBoards: boardSnapshots,
        };
    }

    _emitState() {
        this.emit('stateChanged', this.getState());
    }
}

module.exports = { BgState, BG_PHASE };
