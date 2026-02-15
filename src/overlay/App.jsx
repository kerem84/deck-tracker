import React, { useState, useEffect } from 'react';
import DeckTracker from './components/DeckTracker';
import OpponentTracker from './components/OpponentTracker';
import TurnCounter from './components/TurnCounter';

export default function OverlayApp() {
    const [gameState, setGameState] = useState(null);

    useEffect(() => {
        // Listen for game state updates from Electron main process
        if (window.electronAPI) {
            window.electronAPI.onGameStateUpdate((state) => {
                setGameState(state);
            });
            // Get initial state
            window.electronAPI.getGameState().then(setGameState);
        }
    }, []);

    const isInGame = gameState && gameState.gamePhase !== 'IDLE';

    if (!isInGame) {
        return (
            <div className="overlay-idle">
                <div className="overlay-idle-icon">⚔️</div>
                <p>Waiting for game...</p>
            </div>
        );
    }

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
