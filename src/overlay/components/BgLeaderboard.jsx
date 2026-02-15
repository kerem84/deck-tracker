import { useState } from 'react';

/**
 * BG Leaderboard — shows 8 players with HP, tier, combat results.
 */
export default function BgLeaderboard({ bgState }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const players = bgState?.players || [];
    const localId = bgState?.localPlayerId || 0;
    const nextOpponent = bgState?.combat?.opponentPlayerId || 0;

    if (players.length === 0) {
        return (
            <div className="bg-leaderboard">
                <div className="bg-section-title">Lobby</div>
                <div className="bg-empty">Waiting for players…</div>
            </div>
        );
    }

    return (
        <div className="bg-leaderboard">
            <div className="bg-section-title">Lobby</div>
            {players.map((player, i) => {
                const isLocal = player.playerId === localId;
                const isNext = player.playerId === nextOpponent;
                const isDead = !player.alive;
                const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);

                return (
                    <div
                        key={player.playerId || i}
                        className={`bg-player-row ${isLocal ? 'bg-player-local' : ''} ${isNext ? 'bg-player-next' : ''} ${isDead ? 'bg-player-dead' : ''}`}
                        onClick={() => setSelectedPlayer(player.playerId)}
                    >
                        <div className="bg-player-rank">{i + 1}</div>
                        <div className="bg-player-info">
                            <div className="bg-player-name">
                                {player.heroName || `Player ${player.playerId}`}
                                {isLocal && <span className="bg-you-badge">YOU</span>}
                                {isNext && <span className="bg-next-badge">NEXT</span>}
                            </div>
                            <div className="bg-player-hp-bar">
                                <div
                                    className="bg-player-hp-fill"
                                    style={{ width: `${hpPercent}%` }}
                                />
                                <span className="bg-player-hp-text">{player.hp}</span>
                            </div>
                        </div>
                        <div className="bg-player-tier">
                            <span className="bg-tier-badge">⭐{player.tavernTier}</span>
                        </div>
                        {isDead && <div className="bg-skull">💀</div>}
                    </div>
                );
            })}
        </div>
    );
}
