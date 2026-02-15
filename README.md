# HS Deck Tracker

A real-time Hearthstone deck tracking overlay application built with Electron and React.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-40.4.1-9fe2bf.svg)
![React](https://img.shields.io/badge/React-19.2.4-61dafb.svg)

## Features

- **Real-time Card Tracking**: Automatically tracks your deck and opponent's played cards
- **Deck Import**: Import decks using Hearthstone deck codes
- **Statistics**: Track your win rate and match history by class
- **Always-on-Top Overlay**: Transparent overlay that stays visible during gameplay
- **Turn Counter**: Displays current turn and elapsed time
- **Opponent Tracker**: Shows opponent's revealed cards and hand size

## Screenshots

*Main Window*
- Deck management with import functionality
- Statistics dashboard with class matchups
- Settings for overlay customization

*In-Game Overlay*
- Real-time deck tracking
- Opponent card reveal tracking
- Turn timer and game phase indicator

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Development Setup

```bash
# Clone the repository
git clone https://github.com/kerem84/deck-tracker.git
cd deck-tracker

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Build for Production

```bash
# Build the application
npm run build

# Package for distribution
npm run package
```

The packaged application will be available in the `release` directory.

## Usage

1. **First Launch**: The app will automatically configure Hearthstone's log.config file
2. **Import a Deck**: Go to the "Decks" tab and paste a Hearthstone deck code
3. **Start a Game**: Launch Hearthstone and the overlay will automatically appear
4. **Toggle Overlay**: Use the button in the title bar or tray icon to show/hide the overlay

## Project Structure

```
deck-tracker/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # IPC preload script
├── src/
│   ├── core/            # Core game logic
│   │   ├── cardDatabase.js   # Card data management
│   │   ├── deckManager.js    # Deck storage and import
│   │   ├── gameState.js      # Game state tracking
│   │   ├── logConfig.js      # Hearthstone log configuration
│   │   ├── logParser.js      # Log file parsing
│   │   ├── logWatcher.js     # Log file monitoring
│   │   └── statsManager.js   # Statistics tracking
│   ├── main-window/     # Main application window
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── main.css
│   │   └── pages/       # Decks, Stats, Settings pages
│   └── overlay/         # In-game overlay window
│       ├── App.jsx
│       ├── main.jsx
│       ├── overlay.css
│       └── components/  # DeckTracker, OpponentTracker, TurnCounter
├── assets/              # Application assets
├── data/                # Bundled card data
├── index.html           # Main window entry
├── overlay.html         # Overlay window entry
└── vite.config.js       # Vite configuration
```

## How It Works

The application reads Hearthstone's Power.log file in real-time to track game events:

1. **Log Monitoring**: Watches `Power.log` for new game events
2. **Event Parsing**: Parses game events (CREATE_GAME, TAG_CHANGE, ZONE changes, etc.)
3. **State Tracking**: Maintains game state including:
   - Player's remaining deck cards
   - Cards played by both players
   - Current turn and game phase
   - Opponent's revealed cards
4. **Overlay Display**: Updates the transparent overlay with current game information

## Configuration

### Log File Location
The app automatically detects Hearthstone's log file:
- **Windows**: `%LOCALAPPDATA%\Blizzard\Hearthstone\Logs\Power.log`

### Data Storage
Application data is stored in:
- **Windows**: `%USERPROFILE%\.deck-tracker\`
  - `decks.json` - Saved decks
  - `stats.json` - Game statistics
  - `cards_cache.json` - Cached card database

## Keyboard Shortcuts

- **Toggle Overlay**: Available via tray icon or main window button

## Development

### Tech Stack
- **Electron**: Desktop application framework
- **React**: UI framework
- **Vite**: Build tool and dev server
- **Zustand**: State management (planned)

### Running Tests

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Known Issues

See [CODE_ANALYSIS_REPORT.md](./CODE_ANALYSIS_REPORT.md) for detailed code analysis and identified issues.

## Roadmap

- [ ] Deck export functionality
- [ ] Arena draft helper
- [ ] Replay viewer
- [ ] Multi-language support
- [ ] Cloud sync for decks and stats

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This project is not affiliated with Blizzard Entertainment. Hearthstone is a trademark of Blizzard Entertainment.

## Acknowledgments

- Card data provided by [HearthstoneJSON](https://hearthstonejson.com/)
- Card art by [HearthstoneJSON Art API](https://art.hearthstonejson.com/)

---

**Happy tracking!** 🃏
