import { useState, useEffect } from 'react';

/**
 * BG Board Viewer — shows last-seen opponent board snapshots.
 */
export default function BgBoardViewer({ bgState, selectedPlayer }) {
    const boards = bgState?.lastSeenBoards || {};
    const players = bgState?.players || [];
    const [viewingPlayer, setViewingPlayer] = useState(selectedPlayer || null);

    useEffect(() => {
        if (selectedPlayer) {
            setViewingPlayer(selectedPlayer);
        }
    }, [selectedPlayer]);

    // Find the board to display
    const boardKey = viewingPlayer || Object.keys(boards)[0];
    const board = boards[boardKey] || [];
    const playerInfo = players.find((p) => p.playerId === parseInt(boardKey || '0'));

    return (
        <div className="bg-board-viewer">
            <div className="bg-section-title">
                Last Seen Board
                {playerInfo && (
                    <span className="bg-board-player-name">
                        — {playerInfo.heroName || `Player ${boardKey}`}
                    </span>
                )}
            </div>

            {/* Player selector */}
            <div className="bg-board-tabs">
                {Object.keys(boards).map((pid) => {
                    const pInfo = players.find((p) => p.playerId === parseInt(pid));
                    return (
                        <button
                            key={pid}
                            className={`bg-board-tab ${pid === String(boardKey) ? 'active' : ''}`}
                            onClick={() => setViewingPlayer(pid)}
                        >
                            {pInfo?.heroName?.slice(0, 6) || `P${pid}`}
                        </button>
                    );
                })}
            </div>

            {/* Board minions */}
            {board.length === 0 ? (
                <div className="bg-empty">No board data yet</div>
            ) : (
                <div className="bg-board-grid">
                    {board.map((minion, idx) => (
                        <div key={minion.entityId || idx} className="bg-minion-tile">
                            <div className="bg-minion-name">{minion.name}</div>
                            <div className="bg-minion-stats">
                                <span className="bg-minion-attack">⚔️{minion.attack}</span>
                                <span className="bg-minion-health">❤️{minion.health}</span>
                            </div>
                            {minion.tier > 0 && (
                                <div className="bg-minion-tier">T{minion.tier}</div>
                            )}
                            {minion.tribe && minion.tribe !== 'ALL' && minion.tribe !== 'INVALID' && (
                                <div className="bg-minion-tribe">{minion.tribe}</div>
                            )}
                            {minion.keywords?.length > 0 && (
                                <div className="bg-minion-keywords">
                                    {minion.keywords.map((k) => (
                                        <span key={k} className="bg-keyword-tag">
                                            {k.replace(/_/g, ' ').toLowerCase()}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
