import React, { useState } from 'react';

export default function DeckTracker({ cards = [], deckSize = 0, hand = [] }) {
    const [hoveredCard, setHoveredCard] = useState(null);

    return (
        <div className="tracker-panel deck-tracker">
            <div className="panel-header">
                <span className="panel-icon">🃏</span>
                <span className="panel-title">Your Deck</span>
                <span className="panel-count">{deckSize}</span>
            </div>
            <div className="card-list">
                {cards.length === 0 ? (
                    <div className="empty-state">No deck loaded</div>
                ) : (
                    cards.map((card, i) => (
                        <div
                            key={card.cardId + '-' + i}
                            className={`card-row ${card.count === 0 ? 'exhausted' : ''}`}
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
