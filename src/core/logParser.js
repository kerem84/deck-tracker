const EventEmitter = require('events');

// Regex patterns for Power.log lines
const PATTERNS = {
    // D 12:34:56.7890123 GameState.DebugPrintPower() - CREATE_GAME
    timestamp: /^D\s+([\d:.]+)\s+/,
    createGame: /GameState\.DebugPrintPower\(\)\s*-\s*CREATE_GAME/,
    gameEntity: /GameState\.DebugPrintPower\(\)\s*-\s*GameEntity\s+EntityID=(\d+)/,
    player: /GameState\.DebugPrintPower\(\)\s*-\s*Player\s+EntityID=(\d+)\s+PlayerID=(\d+)\s+GameAccountId=\[.*?\]/,
    fullEntity: /GameState\.DebugPrintPower\(\)\s*-\s*FULL_ENTITY\s*-\s*(?:Creating|Updating)\s+\[entityName=(.*?)\s+id=(\d+)\s+zone=(\w+)\s+zonePos=(\d+)\s+cardId=(\w*)\s+player=(\d+)\]/,
    showEntity: /GameState\.DebugPrintPower\(\)\s*-\s*SHOW_ENTITY\s*-\s*Updating\s+Entity=(?:\[entityName=(.*?)\s+id=(\d+)\s+zone=(\w+)\s+zonePos=(\d+)\s+cardId=(\w*)\s+player=(\d+)\]|(\d+))\s+CardID=(\w+)/,
    hideEntity: /GameState\.DebugPrintPower\(\)\s*-\s*HIDE_ENTITY\s*-\s*Entity=\[entityName=(.*?)\s+id=(\d+)\s+zone=(\w+)\s+zonePos=(\d+)\s+cardId=(\w*)\s+player=(\d+)\]/,
    tagChange: /GameState\.DebugPrintPower\(\)\s*-\s*TAG_CHANGE\s+Entity=(?:\[entityName=(.*?)\s+id=(\d+)\s+zone=(\w+)\s+zonePos=(\d+)\s+cardId=(\w*)\s+player=(\d+)\]|(.+?))\s+tag=(\w+)\s+value=(\w+)/,
    blockStart: /GameState\.DebugPrintPower\(\)\s*-\s*BLOCK_START\s+BlockType=(\w+).*Entity=(?:\[entityName=(.*?)\s+id=(\d+).*?\]|(\d+))/,
    blockEnd: /GameState\.DebugPrintPower\(\)\s*-\s*BLOCK_END/,
    tag: /\s+tag=(\w+)\s+value=(\w+)/,
};

class LogParser extends EventEmitter {
    constructor() {
        super();
        this.currentEntity = null;
        this.inBlock = false;
        this.blockDepth = 0;
    }

    parseLines(lines) {
        for (const line of lines) {
            this._parseLine(line.trim());
        }
    }

    _parseLine(line) {
        if (!line || !line.startsWith('D ')) return;

        // CREATE_GAME
        if (PATTERNS.createGame.test(line)) {
            this.emit('event', { type: 'CREATE_GAME' });
            return;
        }

        // GAME_ENTITY
        const gameEntityMatch = line.match(PATTERNS.gameEntity);
        if (gameEntityMatch) {
            this.currentEntity = { type: 'GAME_ENTITY', entityId: parseInt(gameEntityMatch[1]) };
            return;
        }

        // PLAYER
        const playerMatch = line.match(PATTERNS.player);
        if (playerMatch) {
            this.emit('event', {
                type: 'PLAYER',
                entityId: parseInt(playerMatch[1]),
                playerId: parseInt(playerMatch[2]),
            });
            this.currentEntity = { type: 'PLAYER', entityId: parseInt(playerMatch[1]) };
            return;
        }

        // FULL_ENTITY
        const fullEntityMatch = line.match(PATTERNS.fullEntity);
        if (fullEntityMatch) {
            const event = {
                type: 'FULL_ENTITY',
                entityName: fullEntityMatch[1],
                entityId: parseInt(fullEntityMatch[2]),
                zone: fullEntityMatch[3],
                zonePos: parseInt(fullEntityMatch[4]),
                cardId: fullEntityMatch[5] || '',
                playerId: parseInt(fullEntityMatch[6]),
                tags: {},
            };
            this.currentEntity = event;
            this.emit('event', event);
            return;
        }

        // SHOW_ENTITY
        const showEntityMatch = line.match(PATTERNS.showEntity);
        if (showEntityMatch) {
            const event = {
                type: 'SHOW_ENTITY',
                entityName: showEntityMatch[1] || '',
                entityId: parseInt(showEntityMatch[2] || showEntityMatch[7]),
                zone: showEntityMatch[3] || '',
                cardId: showEntityMatch[8] || showEntityMatch[5] || '',
                playerId: parseInt(showEntityMatch[6]) || 0,
            };
            this.emit('event', event);
            return;
        }

        // HIDE_ENTITY
        const hideEntityMatch = line.match(PATTERNS.hideEntity);
        if (hideEntityMatch) {
            const event = {
                type: 'HIDE_ENTITY',
                entityName: hideEntityMatch[1],
                entityId: parseInt(hideEntityMatch[2]),
                zone: hideEntityMatch[3],
                cardId: hideEntityMatch[5] || '',
                playerId: parseInt(hideEntityMatch[6]),
            };
            this.emit('event', event);
            return;
        }

        // TAG_CHANGE
        const tagChangeMatch = line.match(PATTERNS.tagChange);
        if (tagChangeMatch) {
            const event = {
                type: 'TAG_CHANGE',
                entityName: tagChangeMatch[1] || tagChangeMatch[7] || '',
                entityId: parseInt(tagChangeMatch[2]) || 0,
                zone: tagChangeMatch[3] || '',
                cardId: tagChangeMatch[5] || '',
                playerId: parseInt(tagChangeMatch[6]) || 0,
                tag: tagChangeMatch[8],
                value: tagChangeMatch[9],
            };
            this.emit('event', event);
            return;
        }

        // BLOCK_START
        const blockStartMatch = line.match(PATTERNS.blockStart);
        if (blockStartMatch) {
            this.blockDepth++;
            const event = {
                type: 'BLOCK_START',
                blockType: blockStartMatch[1],
                entityName: blockStartMatch[2] || '',
                entityId: parseInt(blockStartMatch[3] || blockStartMatch[4]) || 0,
            };
            this.emit('event', event);
            return;
        }

        // BLOCK_END
        if (PATTERNS.blockEnd.test(line)) {
            this.blockDepth = Math.max(0, this.blockDepth - 1);
            this.emit('event', { type: 'BLOCK_END' });
            return;
        }

        // Inline tags (part of FULL_ENTITY or other multi-line entries)
        const tagMatch = line.match(PATTERNS.tag);
        if (tagMatch && this.currentEntity) {
            if (!this.currentEntity.tags) this.currentEntity.tags = {};
            this.currentEntity.tags[tagMatch[1]] = tagMatch[2];
        }
    }

    reset() {
        this.currentEntity = null;
        this.blockDepth = 0;
    }
}

module.exports = { LogParser };
