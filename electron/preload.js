const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),

    // Overlay
    toggleOverlay: () => ipcRenderer.send('overlay-toggle'),
    setClickThrough: (val) => ipcRenderer.send('overlay-set-clickthrough', val),

    // Game state listener
    onGameStateUpdate: (callback) => {
        const handler = (_, state) => callback(state);
        ipcRenderer.on('game-state-update', handler);
        return () => ipcRenderer.removeListener('game-state-update', handler);
    },
    onStatsUpdate: (callback) => {
        const handler = (_, stats) => callback(stats);
        ipcRenderer.on('stats-update', handler);
        return () => ipcRenderer.removeListener('stats-update', handler);
    },
    onBgStateUpdate: (callback) => {
        const handler = (_, state) => callback(state);
        ipcRenderer.on('bg-state-update', handler);
        return () => ipcRenderer.removeListener('bg-state-update', handler);
    },
    getGameState: () => ipcRenderer.invoke('get-game-state'),
    getBgStats: () => ipcRenderer.invoke('get-bg-stats'),
    getBgGameHistory: () => ipcRenderer.invoke('get-bg-game-history'),

    // Card database
    getCard: (cardId) => ipcRenderer.invoke('get-card', cardId),
    searchCards: (query) => ipcRenderer.invoke('search-cards', query),

    // Deck management
    getDecks: () => ipcRenderer.invoke('get-decks'),
    saveDeck: (deck) => ipcRenderer.invoke('save-deck', deck),
    deleteDeck: (deckId) => ipcRenderer.invoke('delete-deck', deckId),
    importDeckCode: (code) => ipcRenderer.invoke('import-deck-code', code),
    setActiveDeck: (deckId) => ipcRenderer.invoke('set-active-deck', deckId),

    // Stats
    getStats: () => ipcRenderer.invoke('get-stats'),
    getGameHistory: () => ipcRenderer.invoke('get-game-history'),

    // Game control
    resetGame: () => ipcRenderer.send('reset-game'),
});
