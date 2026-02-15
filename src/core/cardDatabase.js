const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

const CARDS_URL = 'https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json';
const CACHE_FILE = 'cards_cache.json';

class CardDatabase {
    constructor() {
        this.cards = new Map();         // cardId (string) -> card data
        this.cardsByDbfId = new Map();  // dbfId (number) -> card data
        this.initialized = false;
        this.cacheDir = path.join(os.homedir(), '.deck-tracker');
    }

    async initialize() {
        // Try loading from cache first
        if (this._loadFromCache()) {
            console.log(`[CardDatabase] Loaded ${this.cards.size} cards from cache`);
            // Try updating in background
            this._fetchAndCache().catch(() => { });
            return;
        }

        // Try loading bundled fallback
        const bundledPath = path.join(__dirname, '..', '..', 'data', 'cards.json');
        if (fs.existsSync(bundledPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
                this._indexCards(data);
                console.log(`[CardDatabase] Loaded ${this.cards.size} cards from bundled data`);
                this._fetchAndCache().catch(() => { });
                return;
            } catch (err) {
                console.error('[CardDatabase] Failed to load bundled cards:', err.message);
            }
        }

        // Fetch from API
        try {
            await this._fetchAndCache();
        } catch (err) {
            console.error('[CardDatabase] Failed to fetch cards from API:', err.message);
        }
    }

    _loadFromCache() {
        const cachePath = path.join(this.cacheDir, CACHE_FILE);
        try {
            if (!fs.existsSync(cachePath)) return false;

            const stat = fs.statSync(cachePath);
            const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);

            // Use cache if less than 24 hours old
            if (ageHours > 24) return false;

            const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            this._indexCards(data);
            return true;
        } catch {
            return false;
        }
    }

    _fetchAndCache() {
        return new Promise((resolve, reject) => {
            const request = (url, redirectCount = 0) => {
                if (redirectCount > 5) {
                    reject(new Error('Too many redirects'));
                    return;
                }

                https.get(url, (res) => {
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        request(res.headers.location, redirectCount + 1);
                        return;
                    }

                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }

                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        try {
                            const cards = JSON.parse(data);
                            this._indexCards(cards);
                            this._saveToCache(data);
                            console.log(`[CardDatabase] Fetched ${this.cards.size} cards from API`);
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    });
                }).on('error', reject);
            };

            request(CARDS_URL);
        });
    }

    _saveToCache(jsonString) {
        try {
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir, { recursive: true });
            }
            fs.writeFileSync(path.join(this.cacheDir, CACHE_FILE), jsonString, 'utf8');
        } catch (err) {
            console.error('[CardDatabase] Failed to save cache:', err.message);
        }
    }

    _indexCards(cards) {
        this.cards.clear();
        this.cardsByDbfId.clear();

        for (const card of cards) {
            if (card.id) {
                this.cards.set(card.id, card);
            }
            if (card.dbfId) {
                this.cardsByDbfId.set(card.dbfId, card);
            }
        }

        this.initialized = true;
    }

    getCard(cardId) {
        if (!cardId) return null;
        // Try string ID first
        let card = this.cards.get(cardId);
        if (card) return card;
        // Try numeric dbfId
        const numId = parseInt(cardId);
        if (!isNaN(numId)) {
            card = this.cardsByDbfId.get(numId);
        }
        return card || null;
    }

    searchCards(query) {
        if (!query || query.length < 2) return [];
        const q = query.toLowerCase();
        const results = [];
        for (const card of this.cards.values()) {
            if (card.name && card.name.toLowerCase().includes(q)) {
                results.push(card);
                if (results.length >= 20) break;
            }
        }
        return results;
    }

    getCardImageUrl(cardId) {
        return `https://art.hearthstonejson.com/v1/render/latest/enUS/256x/${cardId}.png`;
    }

    getTileImageUrl(cardId) {
        return `https://art.hearthstonejson.com/v1/tiles/${cardId}.png`;
    }

    getAllCards() {
        return Array.from(this.cards.values());
    }
}

module.exports = { CardDatabase };
