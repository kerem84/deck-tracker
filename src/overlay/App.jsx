import React, { useState, useEffect } from 'react';
import DeckTracker from './components/DeckTracker';
import OpponentTracker from './components/OpponentTracker';
import TurnCounter from './components/TurnCounter';
import BgLeaderboard from './components/BgLeaderboard';
import BgBoardViewer from './components/BgBoardViewer';
import BgTurnInfo from './components/BgTurnInfo';
import './bg-overlay.css';

export default function OverlayApp() {
    const [gameState, setGameState] = useState(null);
    const [bgState, setBgState] = useState(null);

    useEffect(() => {
        if (!window.electronAPI) return;

        // Standard game state
        const cleanupGame = window.electronAPI.onGameStateUpdate((state) => {
            setGameState(state);
        });
        // BG state
        const cleanupBg = window.electronAPI.onBgStateUpdate?.((state) => {
            setBgState(state);
        });

        window.electronAPI.getGameState().then(setGameState).catch(() => {});

        return () => {
            if (typeof cleanupGame === 'function') cleanupGame();
            if (typeof cleanupBg === 'function') cleanupBg();
        };
    }, []);

    const isBg = bgState && bgState.phase && bgState.phase !== 'GAME_OVER';
    const isInGame = gameState && gameState.gamePhase !== 'IDLE';

    // Idle state
    if (!isInGame && !isBg) {
        return (
            <div className="overlay-idle">
                <div className="overlay-idle-icon">⚔️</div>
                <p>Waiting for game...</p>
            </div>
        );
    }

    // Battlegrounds mode
    if (isBg) {
        return (
            <div className="overlay-root">
                <BgTurnInfo bgState={bgState} />
                <BgLeaderboard bgState={bgState} />
                <div className="overlay-divider" />
                <BgBoardViewer bgState={bgState} />
            </div>
        );
    }

    // Standard constructed mode
    return (
        <div className="overlay-root">
            <TurnCounter
                turn={gameState.currentTurn}
                turnStartTime={gameState.turnStartTime}
                gamePhase={gameState.gamePhase}
            />
            <DeckTracker
                cards={gameState.player.deckRemaining}
                deckSize={gameState.player.deckSize}
                hand={gameState.player.hand}
            />
            <div className="overlay-divider" />
            <OpponentTracker
                playedCards={gameState.opponent.playedCards}
                handSize={gameState.opponent.handSize}
                deckSize={gameState.opponent.deckSize}
                secrets={gameState.opponent.secrets}
                cardsInHand={gameState.opponent.cardsInHand}
            />
        </div>
    );
}
