import React, { useState, useMemo } from 'react';

export default function OpponentTracker({
    playedCards = [],
    handSize = 0,
    deckSize = 0,
    secrets = [],
    cardsInHand = [],
}) {
    const [hoveredCard, setHoveredCard] = useState(null);

    const aggregated = useMemo(() => {
        const result = [];
        const seen = new Map();
        for (const card of playedCards) {
            if (seen.has(card.cardId)) {
                seen.get(card.cardId).count++;
            } else {
                const entry = { ...card, count: 1 };
                seen.set(card.cardId, entry);
                result.push(entry);
            }
        }
        result.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
        return result;
    }, [playedCards]);

    return (
        <div className="tracker-panel opponent-tracker">
            <div className="panel-header">
                <span className="panel-icon">👁️</span>
                <span className="panel-title">Opponent</span>
            </div>

            <div className="opponent-info-bar">
                <div className="info-chip">
                    <span className="chip-label">Hand</span>
                    <span className="chip-value">{handSize}</span>
                </div>
                <div className="info-chip">
                    <span className="chip-label">Deck</span>
                    <span className="chip-value">{deckSize}</span>
                </div>
            </div>

            {secrets.length > 0 && (
                <div className="secrets-section">
                    <div className="section-label">🔒 Secrets</div>
                    {secrets.map((s, i) => (
                        <div key={i} className="card-row secret-row">
                            <span className="card-cost">{s.cost}</span>
                            <span className="card-name">{s.name}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="section-label played-label">Played Cards</div>
            <div className="card-list">
                {aggregated.length === 0 ? (
                    <div className="empty-state">No cards played</div>
                ) : (
                    aggregated.map((card, i) => (
                        <div
                            key={card.cardId + '-' + i}
                            className="card-row"
                            onMouseEnter={() => setHoveredCard(card)}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <span className="card-cost">{card.cost}</span>
                            <span className="card-name">{card.name}</span>
                            {card.count > 1 && <span className="card-count">×{card.count}</span>}
                            <div
                                className="card-tile-bg"
                                style={{
                                    backgroundImage: `url(https://art.hearthstonejson.com/v1/tiles/${card.cardId}.png)`,
                                }}
                            />
                        </div>
                    ))
                )}
            </div>

            {hoveredCard && (
                <div className="card-tooltip">
                    <img
                        src={`https://art.hearthstonejson.com/v1/render/latest/enUS/256x/${hoveredCard.cardId}.png`}
                        alt={hoveredCard.name}
                    />
                </div>
            )}
        </div>
    );
}
