const EventEmitter = require('events');

const ZONES = {
    DECK: 'DECK',
    HAND: 'HAND',
    PLAY: 'PLAY',
    GRAVEYARD: 'GRAVEYARD',
    SECRET: 'SECRET',
    SETASIDE: 'SETASIDE',
    REMOVEDFROMGAME: 'REMOVEDFROMGAME',
};

const GAME_PHASE = {
    IDLE: 'IDLE',
    MULLIGAN: 'MULLIGAN',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER',
};

class GameState extends EventEmitter {
    constructor(cardDatabase) {
        super();
        this.cardDatabase = cardDatabase;
        this.reset();
    }

    reset() {
        this.state = {
            gamePhase: GAME_PHASE.IDLE,
            currentTurn: 0,
            turnStartTime: null,
            gameStartTime: null,

            // Player info
            player: {
                id: 0,
                entityId: 0,
                name: '',
                heroClass: '',
                deckCards: [],         // Cards known to be in deck (from initial load)
                deckRemaining: [],     // Cards remaining in deck
                hand: [],              // Cards in hand
                played: [],            // Cards played/died
                secrets: [],           // Active secrets
                graveyard: [],
                deckSize: 30,
            },

            // Opponent info
            opponent: {
                id: 0,
                entityId: 0,
                name: '',
                heroClass: '',
                playedCards: [],       // Cards opponent has played (revealed)
                handSize: 0,
                deckSize: 30,
                secrets: [],
                graveyard: [],
                fatigueCount: 0,
                cardsInHand: [],       // Track opponent hand cards with turn info
            },
        };

        // Entity tracker: entityId -> { cardId, zone, playerId, ... }
        this.entities = new Map();
        this.playerEntityMap = new Map(); // playerId -> 'player' | 'opponent'
        this.localPlayerId = 0;
    }

    setPlayerDeck(deck) {
        if (!deck || !deck.cards) return;

        const deckCards = [];
        for (const entry of deck.cards) {
            const cardData = this.cardDatabase?.getCard(entry.cardId);
            for (let i = 0; i < (entry.count || 1); i++) {
                deckCards.push({
                    cardId: entry.cardId,
                    name: cardData?.name || entry.cardId,
                    cost: cardData?.cost ?? 0,
                    type: cardData?.type || '',
                    rarity: cardData?.rarity || '',
                    count: entry.count || 1,
                });
            }
        }

        this.state.player.deckCards = deckCards;
        this.state.player.deckRemaining = [...deckCards];
        this.state.player.deckSize = deckCards.length;
        this._emitState();
    }

    processEvent(event) {
        switch (event.type) {
            case 'CREATE_GAME':
                this._handleCreateGame();
                break;
            case 'PLAYER':
                this._handlePlayer(event);
                break;
            case 'FULL_ENTITY':
                this._handleFullEntity(event);
                break;
            case 'SHOW_ENTITY':
                this._handleShowEntity(event);
                break;
            case 'TAG_CHANGE':
                this._handleTagChange(event);
                break;
            case 'BLOCK_START':
                this._handleBlockStart(event);
                break;
            default:
                break;
        }
    }

    _handleCreateGame() {
        this.reset();
        this.state.gamePhase = GAME_PHASE.MULLIGAN;
        this.state.gameStartTime = Date.now();
        console.log('[GameState] New game started');
        this._emitState();
    }

    _handlePlayer(event) {
        // First player found is assumed to be us (local player)
        if (this.localPlayerId === 0) {
            this.localPlayerId = event.playerId;
            this.state.player.id = event.playerId;
            this.state.player.entityId = event.entityId;
            this.playerEntityMap.set(event.playerId, 'player');
        } else if (!this.playerEntityMap.has(event.playerId)) {
            this.state.opponent.id = event.playerId;
            this.state.opponent.entityId = event.entityId;
            this.playerEntityMap.set(event.playerId, 'opponent');
        }
    }

    _handleFullEntity(event) {
        const entity = {
            entityId: event.entityId,
            cardId: event.cardId,
            zone: event.zone,
            playerId: event.playerId,
            entityName: event.entityName,
            tags: event.tags || {},
        };

        this.entities.set(event.entityId, entity);

        const side = this.playerEntityMap.get(event.playerId);
        if (!side) return;

        // Card being created in a zone
        if (event.zone === ZONES.DECK && event.cardId && side === 'player') {
            // Card added to player's deck
        } else if (event.zone === ZONES.HAND) {
            if (side === 'player' && event.cardId) {
                this._playerDrawCard(event.cardId, event.entityId);
            } else if (side === 'opponent') {
                this.state.opponent.handSize++;
                this.state.opponent.deckSize = Math.max(0, this.state.opponent.deckSize - 1);
                this.state.opponent.cardsInHand.push({
                    entityId: event.entityId,
                    turn: this.state.currentTurn,
                    cardId: event.cardId || null,
                });
            }
        }

        this._emitState();
    }

    _handleShowEntity(event) {
        const entity = this.entities.get(event.entityId);
        if (entity) {
            entity.cardId = event.cardId || entity.cardId;
        }

        // When a card is revealed, update tracking
        const side = entity ? this.playerEntityMap.get(entity.playerId) : null;

        if (side === 'player' && event.cardId) {
            // Player's hidden card is now revealed
            this._playerDrawCard(event.cardId, event.entityId);
        } else if (side === 'opponent' && event.cardId) {
            // Opponent's card revealed (played from hand, etc.)
        }

        this._emitState();
    }

    _handleTagChange(event) {
        // Identify entity
        let entityId = event.entityId;
        let entity = entityId ? this.entities.get(entityId) : null;

        // Handle named entity references (e.g., player names)
        if (!entity && event.entityName) {
            // Try to match by name
            for (const [id, e] of this.entities) {
                if (e.entityName === event.entityName) {
                    entity = e;
                    entityId = id;
                    break;
                }
            }
        }

        const tag = event.tag;
        const value = event.value;

        // Game phase transitions
        if (tag === 'STEP') {
            if (value === 'BEGIN_MULLIGAN') {
                this.state.gamePhase = GAME_PHASE.MULLIGAN;
            } else if (value === 'MAIN_READY' || value === 'MAIN_START') {
                this.state.gamePhase = GAME_PHASE.PLAYING;
            }
        }

        // Turn tracking
        if (tag === 'TURN') {
            this.state.currentTurn = parseInt(value) || 0;
            this.state.turnStartTime = Date.now();
        }

        // Game over
        if (tag === 'PLAYSTATE' && (value === 'WON' || value === 'LOST' || value === 'TIED')) {
            this.state.gamePhase = GAME_PHASE.GAME_OVER;

            // Robust entity-player matching: check entityId first, then playerId, then name
            let isPlayerEntity = false;
            if (entityId) {
                isPlayerEntity = entityId === this.state.player.entityId;
            } else if (entity && entity.playerId) {
                isPlayerEntity = this.playerEntityMap.get(entity.playerId) === 'player';
            } else if (event.entityName) {
                isPlayerEntity = event.entityName === this.state.player.name;
            }

            const result = {
                result: isPlayerEntity ? value : (value === 'WON' ? 'LOST' : 'WON'),
                turns: this.state.currentTurn,
                duration: Date.now() - (this.state.gameStartTime || Date.now()),
                playerClass: this.state.player.heroClass,
                opponentClass: this.state.opponent.heroClass,
                timestamp: Date.now(),
            };

            this.emit('gameEnd', result);
        }

        // Zone changes (card movement)
        if (tag === 'ZONE' && entity) {
            const oldZone = entity.zone;
            const newZone = value;
            entity.zone = newZone;

            this._handleZoneChange(entity, oldZone, newZone);
        }

        // Player names
        if (tag === 'PLAYER_ID' || event.entityName) {
            // Names typically come from the initial PLAYER entity
        }

        // Hero class detection
        if (tag === 'CARDTYPE' && value === 'HERO' && entity) {
            const side = this.playerEntityMap.get(entity.playerId);
            const cardData = this.cardDatabase?.getCard(entity.cardId);
            if (side === 'player' && cardData) {
                this.state.player.heroClass = cardData.cardClass || '';
                this.state.player.name = entity.entityName || '';
            } else if (side === 'opponent' && cardData) {
                this.state.opponent.heroClass = cardData.cardClass || '';
                this.state.opponent.name = entity.entityName || '';
            }
        }

        if (entity) {
            entity.tags = entity.tags || {};
            entity.tags[tag] = value;
        }

        this._emitState();
    }

    _handleBlockStart(event) {
        // Could track block types (PLAY, ATTACK, POWER, TRIGGER) for more context
    }

    _handleZoneChange(entity, oldZone, newZone) {
        const side = this.playerEntityMap.get(entity.playerId);
        if (!side) return;

        const cardId = entity.cardId;
        const cardData = cardId ? this.cardDatabase?.getCard(cardId) : null;
        const cardInfo = {
            cardId,
            entityId: entity.entityId,
            name: cardData?.name || entity.entityName || cardId || 'Unknown',
            cost: cardData?.cost ?? 0,
            type: cardData?.type || '',
            rarity: cardData?.rarity || '',
        };

        if (side === 'player') {
            // Deck -> Hand (draw)
            if (oldZone === ZONES.DECK && newZone === ZONES.HAND) {
                this._playerDrawCard(cardId, entity.entityId);
            }
            // Hand -> Play (play card)
            else if (oldZone === ZONES.HAND && (newZone === ZONES.PLAY || newZone === ZONES.SECRET)) {
                this.state.player.hand = this.state.player.hand.filter(
                    (c) => c.entityId !== entity.entityId
                );
                this.state.player.played.push(cardInfo);
                if (newZone === ZONES.SECRET) {
                    this.state.player.secrets.push(cardInfo);
                }
            }
            // Play -> Graveyard (minion dies)
            else if (newZone === ZONES.GRAVEYARD) {
                this.state.player.graveyard.push(cardInfo);
                this.state.player.secrets = this.state.player.secrets.filter(
                    (c) => c.entityId !== entity.entityId
                );
            }
        } else if (side === 'opponent') {
            // Deck -> Hand (opponent draw)
            if (oldZone === ZONES.DECK && newZone === ZONES.HAND) {
                this.state.opponent.handSize++;
                this.state.opponent.deckSize = Math.max(0, this.state.opponent.deckSize - 1);
                this.state.opponent.cardsInHand.push({
                    entityId: entity.entityId,
                    turn: this.state.currentTurn,
                    cardId: cardId || null,
                });
            }
            // Hand -> Play (opponent plays card)
            else if (oldZone === ZONES.HAND && (newZone === ZONES.PLAY || newZone === ZONES.SECRET)) {
                this.state.opponent.handSize = Math.max(0, this.state.opponent.handSize - 1);
                this.state.opponent.cardsInHand = this.state.opponent.cardsInHand.filter(
                    (c) => c.entityId !== entity.entityId
                );
                if (cardId) {
                    this.state.opponent.playedCards.push(cardInfo);
                }
                if (newZone === ZONES.SECRET) {
                    this.state.opponent.secrets.push(cardInfo);
                }
            }
            // Play -> Graveyard
            else if (newZone === ZONES.GRAVEYARD) {
                this.state.opponent.graveyard.push(cardInfo);
                this.state.opponent.secrets = this.state.opponent.secrets.filter(
                    (c) => c.entityId !== entity.entityId
                );
            }
        }
    }

    _playerDrawCard(cardId, entityId) {
        if (!cardId) return;

        const cardData = this.cardDatabase?.getCard(cardId);
        const cardInfo = {
            cardId,
            entityId,
            name: cardData?.name || cardId,
            cost: cardData?.cost ?? 0,
            type: cardData?.type || '',
            rarity: cardData?.rarity || '',
        };

        // Add to hand
        const alreadyInHand = this.state.player.hand.some((c) => c.entityId === entityId);
        if (!alreadyInHand) {
            this.state.player.hand.push(cardInfo);
        }

        // Remove from deck remaining
        const deckIdx = this.state.player.deckRemaining.findIndex((c) => c.cardId === cardId);
        if (deckIdx !== -1) {
            this.state.player.deckRemaining.splice(deckIdx, 1);
        }
        this.state.player.deckSize = this.state.player.deckRemaining.length;
    }

    getDrawProbability(cardId) {
        const remaining = this.state.player.deckRemaining;
        if (remaining.length === 0) return 0;

        const count = remaining.filter((c) => c.cardId === cardId).length;
        return count / remaining.length;
    }

    getState() {
        return {
            ...this.state,
            player: {
                ...this.state.player,
                deckRemaining: this._aggregateDeckCards(this.state.player.deckRemaining),
            },
        };
    }

    _aggregateDeckCards(cards) {
        const map = new Map();
        for (const card of cards) {
            const existing = map.get(card.cardId);
            if (existing) {
                existing.count++;
            } else {
                map.set(card.cardId, { ...card, count: 1 });
            }
        }
        return Array.from(map.values()).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    }

    _emitState() {
        this.emit('stateChanged', this.getState());
    }
}

module.exports = { GameState, GAME_PHASE, ZONES };
