/**
 * Battlegrounds minion database.
 * Filters HearthstoneJSON card data for BG-specific minions.
 */
class BgMinionDB {
    constructor(cardDatabase) {
        this.cardDatabase = cardDatabase;
        this.minions = new Map();       // dbfId -> minion data
        this.minionsByTier = new Map(); // tier (1-6) -> minion[]
        this.initialized = false;
    }

    /**
     * Build BG minion index from the full card database.
     * Call after CardDatabase.initialize() completes.
     */
    initialize() {
        if (!this.cardDatabase?.initialized) return;

        this.minions.clear();
        this.minionsByTier.clear();

        for (let tier = 1; tier <= 6; tier++) {
            this.minionsByTier.set(tier, []);
        }

        const allCards = this.cardDatabase.getAllCards();

        for (const card of allCards) {
            if (!this._isBgMinion(card)) continue;

            const minion = {
                dbfId: card.dbfId,
                cardId: card.id,
                name: card.name || '',
                attack: card.attack || 0,
                health: card.health || 0,
                tier: card.techLevel || 0,
                tribe: card.race || card.races?.[0] || 'ALL',
                tribes: card.races || (card.race ? [card.race] : []),
                keywords: this._extractKeywords(card),
                text: card.text || '',
                cost: card.cost || 0,
                isGolden: !!card.battlegroundsNormalDbfId,
                normalDbfId: card.battlegroundsNormalDbfId || card.dbfId,
                goldenDbfId: card.battlegroundsPremiumDbfId || null,
            };

            this.minions.set(card.dbfId, minion);

            // Only index non-golden minions in tier lists
            if (!minion.isGolden && minion.tier >= 1 && minion.tier <= 6) {
                this.minionsByTier.get(minion.tier).push(minion);
            }
        }

        // Sort each tier by name
        for (const [, list] of this.minionsByTier) {
            list.sort((a, b) => a.name.localeCompare(b.name));
        }

        this.initialized = true;

        const totalNormal = Array.from(this.minionsByTier.values())
            .reduce((s, arr) => s + arr.length, 0);
        console.log(`[BgMinionDB] Indexed ${this.minions.size} BG cards (${totalNormal} unique normal minions)`);
    }

    /**
     * Check if a card is a BG minion
     */
    _isBgMinion(card) {
        // Has BG-specific fields
        if (card.battlegroundsPremiumDbfId || card.battlegroundsNormalDbfId) return true;
        if (card.techLevel && card.techLevel >= 1) return true;

        // BG heroes
        if (card.battlegroundsHero) return true;

        // Set-based detection
        if (card.set === 'BATTLEGROUNDS' || card.set === 'LETTUCE') return true;

        return false;
    }

    _extractKeywords(card) {
        const keywords = [];
        if (card.mechanics) {
            for (const m of card.mechanics) {
                if (['TAUNT', 'DIVINE_SHIELD', 'POISONOUS', 'WINDFURY',
                    'DEATHRATTLE', 'BATTLECRY', 'REBORN', 'AVENGE',
                    'START_OF_COMBAT', 'VENOMOUS', 'MAGNETIC'].includes(m)) {
                    keywords.push(m);
                }
            }
        }
        return keywords;
    }

    // ── Public API ─────────────────────────────────────

    getMinion(dbfId) {
        return this.minions.get(dbfId) || null;
    }

    getMinionByCardId(cardId) {
        if (!cardId) return null;
        const card = this.cardDatabase?.getCard(cardId);
        if (!card) return null;
        return this.minions.get(card.dbfId) || null;
    }

    getTierMinions(tier) {
        return this.minionsByTier.get(tier) || [];
    }

    /**
     * Get all tribes present in the BG pool
     */
    getActiveTribes() {
        const tribes = new Set();
        for (const [, list] of this.minionsByTier) {
            for (const m of list) {
                if (m.tribe && m.tribe !== 'ALL' && m.tribe !== 'INVALID') {
                    tribes.add(m.tribe);
                }
                for (const t of m.tribes) {
                    if (t !== 'ALL' && t !== 'INVALID') tribes.add(t);
                }
            }
        }
        return Array.from(tribes).sort();
    }

    /**
     * Search minions by name
     */
    searchMinions(query) {
        if (!query || query.length < 2) return [];
        const q = query.toLowerCase();
        const results = [];
        for (const m of this.minions.values()) {
            if (m.isGolden) continue;
            if (m.name.toLowerCase().includes(q)) {
                results.push(m);
                if (results.length >= 20) break;
            }
        }
        return results;
    }

    /**
     * Get pool stats — how many copies of each minion exist by tier
     * Standard BG pool: Tier1=18, Tier2=15, Tier3=13, Tier4=11, Tier5=9, Tier6=7
     */
    getPoolCopies(tier) {
        const copies = { 1: 18, 2: 15, 3: 13, 4: 11, 5: 9, 6: 7 };
        return copies[tier] || 0;
    }
}

module.exports = { BgMinionDB };
