function buyUpgrade(key) {
    const cfg = UPGRADES_CONFIG[key];
    const upgrade = gameState.upgrades[key];

    if (!cfg || !upgrade) {
        console.error('Неизвестный апгрейд:', key);
        return;
    }

    if (upgrade.level >= cfg.maxLevel) {
        showToast('Достигнут максимальный уровень', 'error');
        playErrorSound();
        // Вибрация при ошибке
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        }
        return;
    }

    const cost = getUpgradeCost(key);

    if (gameState.coins < cost) {
        showToast(`Нужно ещё ${formatNumber(cost - gameState.coins)} монет`, 'error');
        playErrorSound();
        // Вибрация при ошибке
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        }
        return;
    }

    gameState.coins -= cost;
    upgrade.level += 1;

    playUpgradeSound();
    // Вибрация при покупке (успех)
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    showToast(`${cfg.name}: уровень ${upgrade.level}!`);
    updateUI();
    updateUpgradeButtons();
    saveGame();
}

function updateUpgradeButtons() {
    for (const key in UPGRADES_CONFIG) {
        const cfg = UPGRADES_CONFIG[key];
        const lvl = gameState.upgrades[key].level;
        const cost = getUpgradeCost(key);

        const btn = document.getElementById(`${key}-btn`);
        const levelSpan = document.getElementById(`${key}-level`);
        const effectSpan = document.getElementById(`${key}-effect`);

        if (levelSpan) levelSpan.textContent = `${lvl}/${cfg.maxLevel}`;
        if (effectSpan) effectSpan.textContent = `+${cfg.effect} монет за тап`;

        if (btn) {
            if (lvl >= cfg.maxLevel) {
                btn.innerHTML = 'MAX';
                btn.disabled = true;
                btn.classList.add('maxed');
            } else {
                btn.innerHTML = `<span class="cost">${formatNumber(cost)}</span> 🪙`;
                btn.disabled = gameState.coins < cost;
                btn.classList.remove('maxed');
            }
        }
    }
}