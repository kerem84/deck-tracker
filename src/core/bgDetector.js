const EventEmitter = require('events');

/**
 * Detects Battlegrounds mode from Power.log events.
 * BG-specific log lines contain "BACON" in block types and entity tags.
 */
class BgDetector extends EventEmitter {
    constructor() {
        super();
        this.isBattlegrounds = false;
        this._detected = false;
    }

    /**
     * Process a parsed log event — check for BG indicators
     */
    processEvent(event) {
        if (this._detected) return;

        // BACON block types indicate BG mode
        if (event.type === 'BLOCK_START' && event.blockType &&
            event.blockType.startsWith('BACON')) {
            this._setBgMode();
            return;
        }

        // TAG_CHANGE with BG-specific tags
        if (event.type === 'TAG_CHANGE') {
            const bgTags = [
                'PLAYER_TECH_LEVEL',
                'BACON_HERO_CAN_BE_DRAFTED',
                'BACON_HERO_POWER_ACTIVATED',
                'NEXT_OPPONENT_PLAYER_ID',
                'BACON_DUMMY_PLAYER',
            ];
            if (bgTags.includes(event.tag)) {
                this._setBgMode();
                return;
            }
        }

        // FULL_ENTITY in BACON zones
        if (event.type === 'FULL_ENTITY' && event.zone === 'BACON') {
            this._setBgMode();
        }
    }

    _setBgMode() {
        this.isBattlegrounds = true;
        this._detected = true;
        console.log('[BgDetector] Battlegrounds mode detected');
        this.emit('bgGameDetected');
    }

    reset() {
        this.isBattlegrounds = false;
        this._detected = false;
    }
}

module.exports = { BgDetector };
