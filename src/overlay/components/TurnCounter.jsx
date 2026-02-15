import React, { useState, useEffect } from 'react';

export default function TurnCounter({ turn = 0, turnStartTime, gamePhase }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!turnStartTime || gamePhase === 'GAME_OVER') {
            setElapsed(0);
            return;
        }

        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - turnStartTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [turnStartTime, gamePhase]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const phaseLabel = {
        IDLE: 'Idle',
        MULLIGAN: 'Mulligan',
        PLAYING: `Turn ${turn}`,
        GAME_OVER: 'Game Over',
    };

    return (
        <div className="turn-counter">
            <div className="turn-phase">{phaseLabel[gamePhase] || ''}</div>
            {turnStartTime && gamePhase === 'PLAYING' && (
                <div className={`turn-timer ${elapsed > 60 ? 'urgent' : ''}`}>
                    {formatTime(elapsed)}
                </div>
            )}
        </div>
    );
}
