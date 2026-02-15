const fs = require('fs');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

class LogWatcher extends EventEmitter {
    constructor(options = {}) {
        super();
        this.logPath = options.logPath || this._getDefaultLogPath();
        this.pollInterval = options.pollInterval || 200;
        this.lastSize = 0;
        this.watcher = null;
        this.pollTimer = null;
        this.isWatching = false;
    }

    _getDefaultLogPath() {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        return path.join(localAppData, 'Blizzard', 'Hearthstone', 'Logs', 'Power.log');
    }

    start() {
        if (this.isWatching) return;
        this.isWatching = true;

        console.log(`[LogWatcher] Watching: ${this.logPath}`);

        // Check if the file exists, if not wait for it
        if (!fs.existsSync(this.logPath)) {
            console.log('[LogWatcher] Log file not found, waiting...');
            this._waitForFile();
            return;
        }

        this._startWatching();
    }

    _waitForFile() {
        const dir = path.dirname(this.logPath);

        // Create directory watcher to detect when file appears
        const checkInterval = setInterval(() => {
            if (!this.isWatching) {
                clearInterval(checkInterval);
                return;
            }
            if (fs.existsSync(this.logPath)) {
                clearInterval(checkInterval);
                console.log('[LogWatcher] Log file found, starting watch');
                this._startWatching();
            }
        }, 2000);
    }

    _startWatching() {
        try {
            const stat = fs.statSync(this.logPath);
            this.lastSize = stat.size;
        } catch {
            this.lastSize = 0;
        }

        // Use polling for reliability on Windows
        this.pollTimer = setInterval(() => this._poll(), this.pollInterval);
    }

    _poll() {
        if (!this.isWatching) return;

        try {
            const stat = fs.statSync(this.logPath);

            // File was truncated (game restarted)
            if (stat.size < this.lastSize) {
                console.log('[LogWatcher] Log file truncated (game restart detected)');
                this.lastSize = 0;
                this.emit('reset');
            }

            // New data available
            if (stat.size > this.lastSize) {
                this._readNewData(stat.size);
            }
        } catch {
            // File doesn't exist or can't be read — might be between games
        }
    }

    _readNewData(currentSize) {
        const readSize = currentSize - this.lastSize;
        const buffer = Buffer.alloc(readSize);

        try {
            const fd = fs.openSync(this.logPath, 'r');
            fs.readSync(fd, buffer, 0, readSize, this.lastSize);
            fs.closeSync(fd);

            const text = buffer.toString('utf8');
            const lines = text.split('\n').filter((l) => l.trim().length > 0);

            if (lines.length > 0) {
                this.emit('lines', lines);
            }

            this.lastSize = currentSize;
        } catch (err) {
            console.error('[LogWatcher] Read error:', err.message);
        }
    }

    stop() {
        this.isWatching = false;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        console.log('[LogWatcher] Stopped');
    }

    setLogPath(newPath) {
        this.stop();
        this.logPath = newPath;
        this.lastSize = 0;
        this.start();
    }
}

module.exports = { LogWatcher };
