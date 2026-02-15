const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');
const { LogWatcher } = require('../src/core/logWatcher');
const { LogParser } = require('../src/core/logParser');
const { GameState } = require('../src/core/gameState');
const { CardDatabase } = require('../src/core/cardDatabase');
const { LogConfigManager } = require('../src/core/logConfig');
const { StatsManager } = require('../src/core/statsManager');
const { DeckManager } = require('../src/core/deckManager');
const { BgDetector } = require('../src/core/bgDetector');
const { BgState } = require('../src/core/bgState');
const { BgMinionDB } = require('../src/core/bgMinionDB');
const { BgStatsManager } = require('../src/core/bgStatsManager');

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let logWatcher = null;
let logParser = null;
let gameState = null;
let cardDatabase = null;
let statsManager = null;
let deckManager = null;
let bgDetector = null;
let bgState = null;
let bgMinionDB = null;
let bgStatsManager = null;

const isDev = !app.isPackaged;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 750,
        minWidth: 900,
        minHeight: 600,
        frame: false,
        backgroundColor: '#0a0a0f',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173/index.html');
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createOverlayWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    overlayWindow = new BrowserWindow({
        width: 260,
        height: 700,
        x: width - 280,
        y: 40,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true,
        focusable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    overlayWindow.setIgnoreMouseEvents(false);

    if (isDev) {
        overlayWindow.loadURL('http://localhost:5173/overlay.html');
    } else {
        overlayWindow.loadFile(path.join(__dirname, '..', 'dist', 'overlay.html'));
    }

    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });
}

async function initializeCore() {
    // Ensure log.config exists
    const logConfigManager = new LogConfigManager();
    logConfigManager.ensureLogConfig();

    // Initialize card database
    cardDatabase = new CardDatabase();
    await cardDatabase.initialize();

    // Initialize stats & deck managers
    statsManager = new StatsManager();
    deckManager = new DeckManager();

    // Initialize game state engine
    gameState = new GameState(cardDatabase);
    gameState.on('stateChanged', (state) => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('game-state-update', state);
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('game-state-update', state);
        }
    });

    gameState.on('gameEnd', (result) => {
        statsManager.recordGame(result);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('stats-update', statsManager.getStats());
        }
    });

    // Initialize log parser
    logParser = new LogParser();
    logParser.on('event', (event) => {
        gameState.processEvent(event);
    });

    // Initialize log watcher
    logWatcher = new LogWatcher();
    logWatcher.on('lines', (lines) => {
        logParser.parseLines(lines);
    });
    logWatcher.start();

    // Initialize BG modules
    bgDetector = new BgDetector();
    bgStatsManager = new BgStatsManager();
    bgMinionDB = new BgMinionDB(cardDatabase);
    bgMinionDB.initialize();
    bgState = new BgState(cardDatabase);

    // Wire log parser events → BG detector
    logParser.on('event', (event) => {
        bgDetector.processEvent(event);
    });

    // When BG detected, start forwarding events to bgState
    bgDetector.on('bgGameDetected', () => {
        // Forward all subsequent events to BG state
        logParser.on('event', (event) => {
            bgState.processEvent(event);
        });
    });

    // BG state updates → overlay
    bgState.on('stateChanged', (state) => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('bg-state-update', state);
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('bg-state-update', state);
        }
    });

    bgState.on('bgGameEnd', (result) => {
        bgStatsManager.recordGame(result);
        bgDetector.reset();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('bg-stats-update', bgStatsManager.getStats());
        }
    });

    // Reset BG state on new game
    gameState.on('stateChanged', (state) => {
        if (state.gamePhase === 'IDLE') {
            bgDetector.reset();
            bgState.reset();
        }
    });
}

function setupIPC() {
    // Window controls
    ipcMain.on('window-minimize', () => mainWindow?.minimize());
    ipcMain.on('window-maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow?.maximize();
        }
    });
    ipcMain.on('window-close', () => mainWindow?.hide());

    // Overlay controls
    ipcMain.on('overlay-toggle', () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.isVisible() ? overlayWindow.hide() : overlayWindow.show();
        }
    });

    ipcMain.on('overlay-set-clickthrough', (_, clickthrough) => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.setIgnoreMouseEvents(clickthrough, { forward: true });
        }
    });

    // Card database
    ipcMain.handle('get-card', (_, cardId) => {
        return cardDatabase?.getCard(cardId) || null;
    });

    ipcMain.handle('search-cards', (_, query) => {
        return cardDatabase?.searchCards(query) || [];
    });

    // Deck management
    ipcMain.handle('get-decks', () => deckManager.getDecks());
    ipcMain.handle('save-deck', (_, deck) => deckManager.saveDeck(deck));
    ipcMain.handle('delete-deck', (_, deckId) => deckManager.deleteDeck(deckId));
    ipcMain.handle('import-deck-code', (_, code) => {
        return deckManager.importDeckCode(code, cardDatabase);
    });
    ipcMain.handle('set-active-deck', (_, deckId) => {
        const deck = deckManager.setActiveDeck(deckId);
        if (deck) gameState.setPlayerDeck(deck);
        return deck;
    });

    // Stats
    ipcMain.handle('get-stats', () => statsManager.getStats());
    ipcMain.handle('get-game-history', () => statsManager.getGameHistory());

    // Game state
    ipcMain.handle('get-game-state', () => gameState?.getState() || null);
    ipcMain.handle('get-bg-state', () => bgState?.getState() || null);
    ipcMain.handle('get-bg-stats', () => bgStatsManager?.getStats() || null);
    ipcMain.handle('get-bg-game-history', () => bgStatsManager?.getGameHistory() || []);

    // Reset
    ipcMain.on('reset-game', () => gameState?.reset());
}

function createTray() {
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
    try {
        tray = new Tray(iconPath);
    } catch {
        // Icon not found in dev mode — skip tray
        return;
    }

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Main Window',
            click: () => {
                if (!mainWindow) createMainWindow();
                mainWindow.show();
                mainWindow.focus();
            },
        },
        {
            label: 'Toggle Overlay',
            click: () => {
                if (overlayWindow && !overlayWindow.isDestroyed()) {
                    overlayWindow.isVisible() ? overlayWindow.hide() : overlayWindow.show();
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            },
        },
    ]);

    tray.setToolTip('Hearthstone Deck Tracker');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        if (!mainWindow) createMainWindow();
        mainWindow.show();
        mainWindow.focus();
    });
}

app.whenReady().then(async () => {
    setupIPC();
    createMainWindow();
    createOverlayWindow();
    createTray();
    await initializeCore();
});

app.on('window-all-closed', () => {
    // Keep running in tray
});

app.on('before-quit', () => {
    logWatcher?.stop();
});

app.on('activate', () => {
    if (!mainWindow) createMainWindow();
});
