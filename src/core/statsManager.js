const fs = require('fs');
const path = require('path');
const os = require('os');

class StatsManager {
    constructor() {
        this.dataDir = path.join(os.homedir(), '.deck-tracker');
        this.statsFile = path.join(this.dataDir, 'stats.json');
        this.stats = this._load();
    }

    _load() {
        try {
            if (fs.existsSync(this.statsFile)) {
                return JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
            }
        } catch { }
        return { games: [], totalWins: 0, totalLosses: 0 };
    }

    _save() {
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }
            fs.writeFileSync(this.statsFile, JSON.stringify(this.stats, null, 2), 'utf8');
        } catch (err) {
            console.error('[StatsManager] Save error:', err.message);
        }
    }

    recordGame(result) {
        const game = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            result: result.result,
            playerClass: result.playerClass || 'Unknown',
            opponentClass: result.opponentClass || 'Unknown',
            turns: result.turns || 0,
            duration: result.duration || 0,
            timestamp: result.timestamp || Date.now(),
        };

        this.stats.games.unshift(game);

        // Keep last 500 games
        if (this.stats.games.length > 500) {
            this.stats.games = this.stats.games.slice(0, 500);
        }

        if (result.result === 'WON') this.stats.totalWins++;
        else if (result.result === 'LOST') this.stats.totalLosses++;

        this._save();
        return game;
    }

    getStats() {
        const classStats = {};
        for (const game of this.stats.games) {
            const key = game.opponentClass || 'Unknown';
            if (!classStats[key]) {
                classStats[key] = { wins: 0, losses: 0, total: 0 };
            }
            classStats[key].total++;
            if (game.result === 'WON') classStats[key].wins++;
            else if (game.result === 'LOST') classStats[key].losses++;
        }

        return {
            totalWins: this.stats.totalWins,
            totalLosses: this.stats.totalLosses,
            totalGames: this.stats.games.length,
            winRate: this.stats.games.length > 0
                ? ((this.stats.totalWins / this.stats.games.length) * 100).toFixed(1)
                : '0.0',
            classStats,
        };
    }

    getGameHistory() {
        return this.stats.games.slice(0, 50);
    }
}

module.exports = { StatsManager };
