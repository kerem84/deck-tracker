import { useState, useEffect } from 'react';

/**
 * BG Stats Page — placement chart, hero stats, recent games.
 */
export default function BgStatsPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (window.electronAPI?.getBgStats) {
            window.electronAPI.getBgStats().then((data) => {
                setStats(data);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return <div className="page"><div className="page-loading">Loading BG stats…</div></div>;
    }

    if (!stats || stats.totalGames === 0) {
        return (
            <div className="page">
                <h2 className="page-title">⚔️ Battlegrounds</h2>
                <div className="empty-state">
                    <p>No Battlegrounds games recorded yet.</p>
                    <p style={{ fontSize: '13px', opacity: 0.5 }}>Play a BG game with the tracker running to see stats here.</p>
                </div>
            </div>
        );
    }

    const placementColors = {
        1: '#fbbf24', 2: '#a3e635', 3: '#34d399', 4: '#22d3ee',
        5: '#818cf8', 6: '#c084fc', 7: '#f472b6', 8: '#f87171',
    };

    return (
        <div className="page">
            <h2 className="page-title">⚔️ Battlegrounds</h2>

            {/* Overview Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Games</div>
                    <div className="stat-value">{stats.totalGames}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Avg Placement</div>
                    <div className="stat-value">{stats.avgPlacement}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Top 4 Rate</div>
                    <div className="stat-value">{stats.top4Rate}%</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Win Rate</div>
                    <div className="stat-value">{stats.winRate}%</div>
                </div>
            </div>

            {/* Hero Performance */}
            {stats.heroStats && stats.heroStats.length > 0 && (
                <div className="section">
                    <h3 className="section-title">Hero Performance</h3>
                    <div className="bg-hero-table">
                        <div className="bg-hero-header">
                            <span>Hero</span>
                            <span>Games</span>
                            <span>Avg</span>
                            <span>Top 4</span>
                        </div>
                        {stats.heroStats.map((hero) => (
                            <div key={hero.hero} className="bg-hero-row">
                                <span className="bg-hero-name">{hero.heroName}</span>
                                <span className="bg-hero-games">{hero.games}</span>
                                <span className="bg-hero-avg">{hero.avgPlacement}</span>
                                <span className="bg-hero-top4">{hero.top4Rate}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Games */}
            {stats.recentGames && stats.recentGames.length > 0 && (
                <div className="section">
                    <h3 className="section-title">Recent Games</h3>
                    <div className="bg-recent-list">
                        {stats.recentGames.map((game) => (
                            <div key={game.id} className="bg-recent-row">
                                <span
                                    className="bg-placement"
                                    style={{
                                        color: placementColors[game.placement] || '#94a3b8',
                                    }}
                                >
                                    #{game.placement}
                                </span>
                                <span className="bg-recent-hero">{game.heroName || 'Unknown'}</span>
                                <span className="bg-recent-tier">T{game.tavernTier}</span>
                                <span className="bg-recent-turns">{game.turns}t</span>
                                <span className="bg-recent-time">
                                    {new Date(game.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
