import React, { useState, useEffect } from 'react';

export default function DecksPage() {
    const [decks, setDecks] = useState([]);
    const [importCode, setImportCode] = useState('');
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [activeDeckId, setActiveDeckId] = useState(null);

    useEffect(() => {
        loadDecks();
    }, []);

    const loadDecks = async () => {
        if (!window.electronAPI) return;
        try {
            const result = await window.electronAPI.getDecks();
            setDecks(result || []);
        } catch (err) {
            console.error('[DecksPage] Failed to load decks:', err);
        }
    };

    const handleImport = async () => {
        if (!importCode.trim() || !window.electronAPI) return;
        setImporting(true);
        setImportError('');

        try {
            const result = await window.electronAPI.importDeckCode(importCode);
            if (result.error) {
                setImportError(result.error);
            } else {
                setImportCode('');
                loadDecks();
            }
        } catch (err) {
            setImportError('Failed to import deck: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleDelete = async (deckId) => {
        if (!window.electronAPI) return;
        try {
            await window.electronAPI.deleteDeck(deckId);
            loadDecks();
        } catch (err) {
            console.error('[DecksPage] Failed to delete deck:', err);
        }
    };

    const handleActivate = async (deckId) => {
        if (!window.electronAPI) return;
        try {
            await window.electronAPI.setActiveDeck(deckId);
            setActiveDeckId(deckId);
        } catch (err) {
            console.error('[DecksPage] Failed to activate deck:', err);
        }
    };

    const classColors = {
        MAGE: '#3b82f6',
        WARRIOR: '#b91c1c',
        PALADIN: '#f59e0b',
        HUNTER: '#22c55e',
        ROGUE: '#6b7280',
        PRIEST: '#e5e7eb',
        SHAMAN: '#2563eb',
        WARLOCK: '#7c3aed',
        DRUID: '#854d0e',
        DEMONHUNTER: '#15803d',
        DEATHKNIGHT: '#60a5fa',
    };

    return (
        <div className="page decks-page">
            <div className="page-header">
                <h1>Decks</h1>
                <span className="deck-count">{decks.length} decks</span>
            </div>

            {/* Import Section */}
            <div className="import-section">
                <div className="import-input-row">
                    <textarea
                        className="import-textarea"
                        value={importCode}
                        onChange={(e) => setImportCode(e.target.value)}
                        placeholder="Paste your Hearthstone deck code here..."
                        rows={3}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleImport}
                        disabled={importing || !importCode.trim()}
                    >
                        {importing ? 'Importing...' : 'Import'}
                    </button>
                </div>
                {importError && <div className="error-msg">{importError}</div>}
            </div>

            {/* Deck Grid */}
            <div className="deck-grid">
                {decks.length === 0 ? (
                    <div className="empty-decks">
                        <div className="empty-icon">🃏</div>
                        <p>No decks yet</p>
                        <p className="empty-sub">Import a deck code to get started</p>
                    </div>
                ) : (
                    decks.map((deck) => (
                        <div
                            key={deck.id}
                            className={`deck-card ${activeDeckId === deck.id ? 'active' : ''}`}
                            onClick={() => handleActivate(deck.id)}
                        >
                            <div
                                className="deck-card-accent"
                                style={{ background: classColors[deck.heroClass] || '#4b5563' }}
                            />
                            <div className="deck-card-body">
                                <div className="deck-card-header">
                                    <h3 className="deck-name">{deck.name}</h3>
                                    <span className="deck-format">{deck.format || ''}</span>
                                </div>
                                <div className="deck-meta">
                                    <span className="deck-class">{deck.heroClass || 'Unknown'}</span>
                                    <span className="deck-card-count">{deck.cards?.reduce((s, c) => s + (c.count || 1), 0) || 0} cards</span>
                                </div>
                                <div className="deck-actions">
                                    {activeDeckId === deck.id && (
                                        <span className="active-badge">Active</span>
                                    )}
                                    <button
                                        className="btn-icon btn-delete"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(deck.id); }}
                                        title="Delete deck"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
