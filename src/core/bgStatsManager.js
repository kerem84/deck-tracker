const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Battlegrounds stats manager.
 * Persists BG game history — placement, hero, tier, comp data.
 */
class BgStatsManager {
    constructor() {
        this.dataDir = path.join(os.homedir(), '.deck-tracker');
        this.statsFile = path.join(this.dataDir, 'bg-stats.json');
        this.history = this._load();
    }

    _load() {
        try {
            if (fs.existsSync(this.statsFile)) {
                return JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
            }
        } catch { }
        return [];
    }

    _save() {
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }
            fs.writeFileSync(this.statsFile, JSON.stringify(this.history, null, 2), 'utf8');
        } catch (err) {
            console.error('[BgStatsManager] Save error:', err.message);
        }
    }

    /**
     * Record a completed BG game
     */
    recordGame(result) {
        const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            placement: result.placement || 8,
            hero: result.hero || '',
            heroName: result.heroName || '',
            tavernTier: result.tavernTier || 1,
            turns: result.turns || 0,
            duration: result.duration || 0,
            timestamp: result.timestamp || Date.now(),
        };

        this.history.unshift(entry);
        // Keep last 200 games
        if (this.history.length > 200) {
            this.history = this.history.slice(0, 200);
        }

        this._save();
        console.log(`[BgStatsManager] Recorded: #${entry.placement} with ${entry.heroName} (${entry.turns} turns)`);
        return entry;
    }

    /**
     * Get aggregate stats
     */
    getStats() {
        const total = this.history.length;
        if (total === 0) {
            return {
                totalGames: 0, avgPlacement: 0, top4Rate: 0, winRate: 0,
                heroStats: {}, recentGames: [],
            };
        }

        const placements = this.history.map((g) => g.placement);
        const avgPlacement = (placements.reduce((s, p) => s + p, 0) / total).toFixed(1);
        const top4 = placements.filter((p) => p <= 4).length;
        const wins = placements.filter((p) => p === 1).length;

        // Hero breakdown
        const heroMap = new Map();
        for (const game of this.history) {
            const key = game.hero || 'Unknown';
            if (!heroMap.has(key)) {
                heroMap.set(key, {
                    hero: key,
                    heroName: game.heroName || key,
                    games: 0,
                    totalPlacement: 0,
                    top4: 0,
                    wins: 0,
                });
            }
            const h = heroMap.get(key);
            h.games++;
            h.totalPlacement += game.placement;
            if (game.placement <= 4) h.top4++;
            if (game.placement === 1) h.wins++;
        }

        const heroStats = [];
        for (const h of heroMap.values()) {
            heroStats.push({
                ...h,
                avgPlacement: (h.totalPlacement / h.games).toFixed(1),
                top4Rate: ((h.top4 / h.games) * 100).toFixed(0),
            });
        }
        heroStats.sort((a, b) => parseFloat(a.avgPlacement) - parseFloat(b.avgPlacement));

        return {
            totalGames: total,
            avgPlacement: parseFloat(avgPlacement),
            top4Rate: ((top4 / total) * 100).toFixed(0),
            winRate: ((wins / total) * 100).toFixed(0),
            heroStats,
            recentGames: this.history.slice(0, 20),
        };
    }

    getGameHistory() {
        return this.history.slice(0, 50);
    }
}

module.exports = { BgStatsManager };
