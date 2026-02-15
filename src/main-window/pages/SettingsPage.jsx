import React, { useState } from 'react';

export default function SettingsPage() {
    const [overlayOpacity, setOverlayOpacity] = useState(75);
    const [overlayScale, setOverlayScale] = useState(100);
    const [autoStart, setAutoStart] = useState(false);
    const [language, setLanguage] = useState('en');

    return (
        <div className="page settings-page">
            <div className="page-header"><h1>Settings</h1></div>

            <div className="settings-sections">
                {/* Overlay Settings */}
                <div className="settings-group">
                    <h2 className="group-title">Overlay</h2>

                    <div className="setting-row">
                        <div className="setting-info">
                            <span className="setting-name">Overlay Opacity</span>
                            <span className="setting-desc">Transparency of the overlay panels</span>
                        </div>
                        <div className="setting-control">
                            <input
                                type="range"
                                min="20"
                                max="100"
                                value={overlayOpacity}
                                onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
                                className="slider"
                            />
                            <span className="slider-value">{overlayOpacity}%</span>
                        </div>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <span className="setting-name">Overlay Scale</span>
                            <span className="setting-desc">Size of the overlay elements</span>
                        </div>
                        <div className="setting-control">
                            <input
                                type="range"
                                min="50"
                                max="150"
                                value={overlayScale}
                                onChange={(e) => setOverlayScale(parseInt(e.target.value))}
                                className="slider"
                            />
                            <span className="slider-value">{overlayScale}%</span>
                        </div>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <span className="setting-name">Toggle Overlay</span>
                            <span className="setting-desc">Show or hide the in-game overlay</span>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => window.electronAPI?.toggleOverlay()}
                        >
                            Toggle
                        </button>
                    </div>
                </div>

                {/* General Settings */}
                <div className="settings-group">
                    <h2 className="group-title">General</h2>

                    <div className="setting-row">
                        <div className="setting-info">
                            <span className="setting-name">Launch on Startup</span>
                            <span className="setting-desc">Automatically start with Windows</span>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={autoStart}
                                onChange={(e) => setAutoStart(e.target.checked)}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <span className="setting-name">Language</span>
                            <span className="setting-desc">Card names and UI language</span>
                        </div>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="select"
                        >
                            <option value="en">English</option>
                            <option value="tr">Türkçe</option>
                            <option value="de">Deutsch</option>
                            <option value="fr">Français</option>
                            <option value="es">Español</option>
                            <option value="ko">한국어</option>
                            <option value="zh">中文</option>
                            <option value="ja">日本語</option>
                        </select>
                    </div>
                </div>

                {/* About */}
                <div className="settings-group">
                    <h2 className="group-title">About</h2>
                    <div className="about-box">
                        <div className="about-name">HS Deck Tracker</div>
                        <div className="about-version">v1.0.0</div>
                        <p className="about-desc">
                            Open-source Hearthstone deck tracker. Reads game logs to provide
                            real-time card tracking during matches.
                        </p>
                        <div className="about-links">
                            <span className="about-legal">
                                Not affiliated with Blizzard Entertainment.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
