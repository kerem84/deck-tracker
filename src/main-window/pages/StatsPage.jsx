import React, { useState, useEffect } from 'react';

export default function StatsPage() {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        loadData();
        if (!window.electronAPI) return;
        const cleanup = window.electronAPI.onStatsUpdate((s) => setStats(s));
        return () => {
            if (typeof cleanup === 'function') cleanup();
        };
    }, []);

    const loadData = async () => {
        if (!window.electronAPI) return;
        try {
            const [s, h] = await Promise.all([
                window.electronAPI.getStats(),
                window.electronAPI.getGameHistory(),
            ]);
            setStats(s);
            setHistory(h || []);
        } catch (err) {
            console.error('[StatsPage] Failed to load data:', err);
        }
    };

    if (!stats) {
        return (
            <div className="page stats-page">
                <div className="page-header"><h1>Statistics</h1></div>
                <div className="empty-decks">
                    <div className="empty-icon">📊</div>
                    <p>Loading statistics...</p>
                </div>
            </div>
        );
    }

    const classIcons = {
        MAGE: '🔮', WARRIOR: '⚔️', PALADIN: '🛡️', HUNTER: '🏹',
        ROGUE: '🗡️', PRIEST: '✨', SHAMAN: '⚡', WARLOCK: '🔥',
        DRUID: '🌿', DEMONHUNTER: '👁️', DEATHKNIGHT: '💀', Unknown: '❓',
    };

    return (
        <div className="page stats-page">
            <div className="page-header"><h1>Statistics</h1></div>

            {/* Overview Cards */}
            <div className="stats-overview">
                <div className="stat-card">
                    <div className="stat-value">{stats.totalGames}</div>
                    <div className="stat-label">Games</div>
                </div>
                <div className="stat-card win">
                    <div className="stat-value">{stats.totalWins}</div>
                    <div className="stat-label">Wins</div>
                </div>
                <div className="stat-card loss">
                    <div className="stat-value">{stats.totalLosses}</div>
                    <div className="stat-label">Losses</div>
                </div>
                <div className="stat-card rate">
                    <div className="stat-value">{stats.winRate}%</div>
                    <div className="stat-label">Win Rate</div>
                </div>
            </div>

            {/* Class Matchups */}
            {Object.keys(stats.classStats || {}).length > 0 && (
                <div className="section">
                    <h2 className="section-title">Matchups</h2>
                    <div className="matchup-grid">
                        {Object.entries(stats.classStats)
                            .sort(([, a], [, b]) => b.total - a.total)
                            .map(([cls, data]) => {
                                const wr = data.total > 0 ? ((data.wins / data.total) * 100).toFixed(0) : 0;
                                return (
                                    <div key={cls} className="matchup-row">
                                        <span className="matchup-icon">{classIcons[cls] || '❓'}</span>
                                        <span className="matchup-class">{cls}</span>
                                        <div className="matchup-bar-wrap">
                                            <div className="matchup-bar" style={{ width: `${wr}%` }} />
                                        </div>
                                        <span className="matchup-wr">{wr}%</span>
                                        <span className="matchup-record">{data.wins}W {data.losses}L</span>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Game History */}
            <div className="section">
                <h2 className="section-title">Recent Games</h2>
                {history.length === 0 ? (
                    <div className="empty-box">No games recorded yet</div>
                ) : (
                    <div className="history-list">
                        {history.map((game) => (
                            <div key={game.id} className={`history-row ${game.result === 'WON' ? 'win' : 'loss'}`}>
                                <span className={`result-badge ${game.result === 'WON' ? 'win' : 'loss'}`}>
                                    {game.result === 'WON' ? 'W' : 'L'}
                                </span>
                                <span className="history-vs">
                                    {classIcons[game.playerClass] || '❓'} vs {classIcons[game.opponentClass] || '❓'}
                                </span>
                                <span className="history-turns">{game.turns} turns</span>
                                <span className="history-date">
                                    {new Date(game.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
