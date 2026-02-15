const fs = require('fs');
const path = require('path');
const os = require('os');

class DeckManager {
    constructor() {
        this.dataDir = path.join(os.homedir(), '.deck-tracker');
        this.decksFile = path.join(this.dataDir, 'decks.json');
        this.decks = this._load();
        this.activeDeckId = null;
    }

    _load() {
        try {
            if (fs.existsSync(this.decksFile)) {
                return JSON.parse(fs.readFileSync(this.decksFile, 'utf8'));
            }
        } catch (err) {
            console.error('[DeckManager] Failed to load decks:', err.message);
        }
        return [];
    }

    _save() {
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }
            fs.writeFileSync(this.decksFile, JSON.stringify(this.decks, null, 2), 'utf8');
        } catch (err) {
            console.error('[DeckManager] Save error:', err.message);
        }
    }

    getDecks() {
        return this.decks;
    }

    saveDeck(deck) {
        const existing = this.decks.findIndex((d) => d.id === deck.id);
        if (existing !== -1) {
            this.decks[existing] = { ...this.decks[existing], ...deck, updatedAt: Date.now() };
        } else {
            this.decks.push({
                ...deck,
                id: deck.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                name: deck.name || 'Unnamed Deck',
                heroClass: deck.heroClass || '',
                cards: deck.cards || [],
                createdAt: deck.createdAt || Date.now(),
                updatedAt: Date.now(),
            });
        }
        this._save();
        return this.decks;
    }

    deleteDeck(deckId) {
        this.decks = this.decks.filter((d) => d.id !== deckId);
        if (this.activeDeckId === deckId) this.activeDeckId = null;
        this._save();
        return this.decks;
    }

    setActiveDeck(deckId) {
        this.activeDeckId = deckId;
        return this.decks.find((d) => d.id === deckId) || null;
    }

    getActiveDeck() {
        if (!this.activeDeckId) return null;
        return this.decks.find((d) => d.id === this.activeDeckId) || null;
    }

    /**
     * Import a Hearthstone deck code.
     * Deck codes are base64-encoded binary data.
     * Format: [reserved byte][version][format][num heroes][hero dbfIds...]
     *         [num single-copy][single dbfIds...][num double-copy][double dbfIds...]
     *         [num n-copy][n, dbfId pairs...]
     */
    importDeckCode(deckCode, cardDatabase) {
        try {
            // Parse the pasted text — handle full deck export format
            const lines = deckCode.trim().split('\n');
            let code = '';
            let deckName = '';
            let deckClass = '';

            for (const line of lines) {
                const trimmed = line.trim();

                // Skip empty lines
                if (!trimmed) continue;

                // Comment lines (# ...)
                if (trimmed.startsWith('#')) {
                    const content = trimmed.replace(/^#+\s*/, '').trim();

                    // Extract deck name from first meaningful comment (### Arcane Mage)
                    if (!deckName && content && !content.startsWith('Class:') &&
                        !content.startsWith('Format:') && !content.startsWith('To use') &&
                        !content.startsWith('Find this') && !content.match(/^\d+x\s/)) {
                        deckName = content;
                    }

                    // Extract class from "# Class: Mage"
                    const classMatch = content.match(/^Class:\s*(.+)/i);
                    if (classMatch) {
                        deckClass = classMatch[1].trim().toUpperCase();
                    }

                    continue;
                }

                // Base64 deck code line — must be alphanumeric + /+=
                if (trimmed.length > 5 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
                    code = trimmed;
                }
            }

            if (!code) {
                return { error: 'No valid deck code found. Paste the full deck export text including the base64 code line.' };
            }

            const buffer = Buffer.from(code, 'base64');
            let offset = 0;

            // Varint reader — uses multiplication to avoid 32-bit bitwise overflow
            const readVarint = () => {
                let result = 0;
                let multiplier = 1;
                let byte;
                do {
                    if (offset >= buffer.length) throw new Error('Unexpected end of deck code data');
                    byte = buffer[offset++];
                    result += (byte & 0x7f) * multiplier;
                    multiplier *= 128;
                } while (byte & 0x80);
                return result;
            };

            // Reserved byte (0x00)
            readVarint();
            // Version
            readVarint();
            // Format (Standard=2, Wild=1, Classic=3)
            const format = readVarint();
            // Heroes
            const numHeroes = readVarint();
            const heroDbfIds = [];
            for (let i = 0; i < numHeroes; i++) {
                heroDbfIds.push(readVarint());
            }
            // Single-copy cards (1x)
            const numSingle = readVarint();
            const singleCards = [];
            for (let i = 0; i < numSingle; i++) {
                singleCards.push(readVarint());
            }
            // Double-copy cards (2x)
            const numDouble = readVarint();
            const doubleCards = [];
            for (let i = 0; i < numDouble; i++) {
                doubleCards.push(readVarint());
            }
            // N-copy cards (3+x) — [count, dbfId] pairs
            const nCopyCards = [];
            if (offset < buffer.length) {
                try {
                    const numNCopy = readVarint();
                    for (let i = 0; i < numNCopy; i++) {
                        const count = readVarint();
                        const dbfId = readVarint();
                        nCopyCards.push({ dbfId, count });
                    }
                } catch { /* No n-copy section — ok */ }
            }

            // Build card list
            const cards = [];
            let heroClass = deckClass; // Use parsed class from comments as primary

            // Try to get hero class from card database if not found in comments
            if (!heroClass && heroDbfIds.length > 0 && cardDatabase) {
                const heroCard = this._lookupByDbfId(cardDatabase, heroDbfIds[0]);
                if (heroCard) {
                    heroClass = heroCard.cardClass || '';
                }
            }

            for (const dbfId of singleCards) {
                const card = this._lookupByDbfId(cardDatabase, dbfId);
                cards.push({
                    dbfId,
                    cardId: card?.id || '',
                    name: card?.name || `Unknown (${dbfId})`,
                    cost: card?.cost ?? 0,
                    count: 1,
                });
            }

            for (const dbfId of doubleCards) {
                const card = this._lookupByDbfId(cardDatabase, dbfId);
                cards.push({
                    dbfId,
                    cardId: card?.id || '',
                    name: card?.name || `Unknown (${dbfId})`,
                    cost: card?.cost ?? 0,
                    count: 2,
                });
            }

            for (const { dbfId, count } of nCopyCards) {
                const card = this._lookupByDbfId(cardDatabase, dbfId);
                cards.push({
                    dbfId,
                    cardId: card?.id || '',
                    name: card?.name || `Unknown (${dbfId})`,
                    cost: card?.cost ?? 0,
                    count,
                });
            }

            // Sort by mana cost
            cards.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

            const totalCards = cards.reduce((s, c) => s + c.count, 0);

            const deck = {
                name: deckName || `Imported Deck`,
                heroClass,
                format: format === 2 ? 'Standard' : format === 1 ? 'Wild' : 'Classic',
                cards,
                deckCode: code,
                totalCards,
            };

            console.log(`[DeckManager] Imported "${deck.name}" (${heroClass}) — ${totalCards} cards, ${cards.length} unique`);

            // Duplicate detection: update existing deck with same deckCode
            const existingIdx = this.decks.findIndex((d) => d.deckCode === code);
            if (existingIdx !== -1) {
                this.decks[existingIdx] = { ...this.decks[existingIdx], ...deck, updatedAt: Date.now() };
                this._save();
                return { success: true, deck: this.decks[existingIdx], updated: true };
            }

            this.saveDeck(deck);
            return { success: true, deck };
        } catch (err) {
            console.error('[DeckManager] Import error:', err);
            return { error: 'Failed to parse deck code: ' + err.message };
        }
    }

    /**
     * Lookup card by numeric dbfId in card database
     */
    _lookupByDbfId(cardDatabase, dbfId) {
        if (!cardDatabase || !dbfId) return null;
        return cardDatabase?.cardsByDbfId?.get(dbfId)
            || cardDatabase?.getCard(String(dbfId))
            || null;
    }
}

module.exports = { DeckManager };
