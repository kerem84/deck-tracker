/**
 * BG Turn Info — phase, turn number, tier, gold display.
 */
export default function BgTurnInfo({ bgState }) {
    const phase = bgState?.phase || 'HERO_PICK';
    const turn = bgState?.turn || 0;
    const recruit = bgState?.recruit || {};
    const localPlayer = bgState?.players?.find(
        (p) => p.playerId === bgState?.localPlayerId
    );
    const tavernTier = localPlayer?.tavernTier || 1;

    const phaseLabels = {
        HERO_PICK: '🎭 Hero Pick',
        RECRUIT: '🛒 Recruit',
        COMBAT: '⚔️ Combat',
        GAME_OVER: '🏁 Game Over',
    };

    const phaseColors = {
        HERO_PICK: '#a78bfa',
        RECRUIT: '#34d399',
        COMBAT: '#f87171',
        GAME_OVER: '#94a3b8',
    };

    // Tavern tier upgrade costs
    const tierUpgradeCost = { 1: 5, 2: 7, 3: 8, 4: 9, 5: 11, 6: 0 };

    return (
        <div className="bg-turn-info">
            <div className="bg-info-row">
                <span
                    className="bg-phase-badge"
                    style={{ background: phaseColors[phase] || '#64748b' }}
                >
                    {phaseLabels[phase] || phase}
                </span>
                <span className="bg-turn-number">Turn {turn}</span>
            </div>

            <div className="bg-info-row">
                <div className="bg-tier-display">
                    <span className="bg-tier-stars">
                        {'⭐'.repeat(Math.min(tavernTier, 6))}
                    </span>
                    <span className="bg-tier-label">Tier {tavernTier}</span>
                    {tierUpgradeCost[tavernTier] > 0 && (
                        <span className="bg-tier-upgrade">
                            ↑ {tierUpgradeCost[tavernTier]}🪙
                        </span>
                    )}
                </div>
            </div>

            {phase === 'RECRUIT' && (
                <div className="bg-info-row">
                    <span className="bg-gold-display">
                        🪙 {recruit.gold || 0}
                    </span>
                    {recruit.frozen && (
                        <span className="bg-frozen-badge">❄️ Frozen</span>
                    )}
                </div>
            )}
        </div>
    );
}
