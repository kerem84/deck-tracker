import React, { useState, useEffect } from 'react';
import DecksPage from './pages/DecksPage';
import StatsPage from './pages/StatsPage';
import BgStatsPage from './pages/BgStatsPage';
import SettingsPage from './pages/SettingsPage';

const TABS = [
    { id: 'decks', label: 'Decks', icon: '🃏' },
    { id: 'stats', label: 'Stats', icon: '📊' },
    { id: 'battlegrounds', label: 'BG', icon: '⚔️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function MainApp() {
    const [activeTab, setActiveTab] = useState('decks');
    const [gameState, setGameState] = useState(null);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.onGameStateUpdate((state) => setGameState(state));
        }
    }, []);

    const isInGame = gameState && gameState.gamePhase !== 'IDLE';

    return (
        <div className="app-shell">
            {/* Custom Titlebar */}
            <header className="titlebar">
                <div className="titlebar-drag">
                    <div className="titlebar-logo">
                        <span className="logo-icon">⚔️</span>
                        <span className="logo-text">HS Deck Tracker</span>
                    </div>
                    {isInGame && (
                        <div className="game-indicator">
                            <span className="game-dot" />
                            <span>In Game — Turn {gameState.currentTurn}</span>
                        </div>
                    )}
                </div>
                <div className="titlebar-actions">
                    <button className="tb-btn" onClick={() => window.electronAPI?.toggleOverlay()} title="Toggle Overlay">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.3" />
                            <rect x="8" y="8" width="13" height="13" rx="2" />
                        </svg>
                    </button>
                    <button className="tb-btn" onClick={() => window.electronAPI?.minimize()}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <button className="tb-btn" onClick={() => window.electronAPI?.maximize()}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="5" width="14" height="14" rx="1" /></svg>
                    </button>
                    <button className="tb-btn tb-close" onClick={() => window.electronAPI?.close()}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <div className="app-body">
                {/* Sidebar Nav */}
                <nav className="sidebar">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="nav-icon">{tab.icon}</span>
                            <span className="nav-label">{tab.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <main className="content">
                    {activeTab === 'decks' && <DecksPage />}
                    {activeTab === 'stats' && <StatsPage />}
                    {activeTab === 'battlegrounds' && <BgStatsPage />}
                    {activeTab === 'settings' && <SettingsPage />}
                </main>
            </div>
        </div>
    );
}
