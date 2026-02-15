const fs = require('fs');
const path = require('path');
const os = require('os');

class LogConfigManager {
    constructor() {
        this.configPath = this._getConfigPath();
    }

    _getConfigPath() {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        return path.join(localAppData, 'Blizzard', 'Hearthstone', 'log.config');
    }

    ensureLogConfig() {
        const requiredSections = {
            Power: {
                LogLevel: '1',
                FilePrinting: 'True',
                ConsolePrinting: 'False',
                ScreenPrinting: 'False',
                Verbose: 'True',
            },
            Achievements: {
                LogLevel: '1',
                FilePrinting: 'True',
                ConsolePrinting: 'False',
                ScreenPrinting: 'False',
                Verbose: 'False',
            },
            Arena: {
                LogLevel: '1',
                FilePrinting: 'True',
                ConsolePrinting: 'False',
                ScreenPrinting: 'False',
                Verbose: 'False',
            },
            LoadingScreen: {
                LogLevel: '1',
                FilePrinting: 'True',
                ConsolePrinting: 'False',
                ScreenPrinting: 'False',
                Verbose: 'False',
            },
        };

        try {
            let existingContent = '';
            if (fs.existsSync(this.configPath)) {
                existingContent = fs.readFileSync(this.configPath, 'utf8');
            } else {
                // Ensure directory exists
                const dir = path.dirname(this.configPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            }

            let modified = false;
            let content = existingContent;

            for (const [section, values] of Object.entries(requiredSections)) {
                const sectionHeader = `[${section}]`;
                const sectionBlock = [
                    sectionHeader,
                    ...Object.entries(values).map(([k, v]) => `${k}=${v}`),
                ].join('\n');

                if (!content.includes(sectionHeader)) {
                    // Section missing — append it
                    content += '\n' + sectionBlock + '\n';
                    modified = true;
                } else {
                    // Section exists — check each value and update if needed
                    for (const [key, val] of Object.entries(values)) {
                        const keyRegex = new RegExp(
                            `(\\[${section}\\][\\s\\S]*?)${key}\\s*=\\s*(.+)`,
                        );
                        const match = content.match(keyRegex);
                        if (match && match[2].trim() !== val) {
                            content = content.replace(
                                new RegExp(`(\\[${section}\\][\\s\\S]*?)${key}\\s*=\\s*.+`),
                                `$1${key}=${val}`,
                            );
                            modified = true;
                        } else if (!match) {
                            // Key missing within section — insert after header
                            content = content.replace(
                                sectionHeader,
                                `${sectionHeader}\n${key}=${val}`,
                            );
                            modified = true;
                        }
                    }
                }
            }

            if (modified) {
                fs.writeFileSync(this.configPath, content.trim() + '\n', 'utf8');
                console.log(`[LogConfig] Updated log.config at: ${this.configPath}`);
            } else {
                console.log(`[LogConfig] log.config already configured`);
            }

            return true;
        } catch (err) {
            console.error(`[LogConfig] Failed to update log.config:`, err.message);
            return false;
        }
    }
}

module.exports = { LogConfigManager };
