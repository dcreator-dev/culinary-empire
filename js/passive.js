function buyPassiveUpgrade(key) {
    const cfg = PASSIVE_CONFIG[key];
    const upgrade = gameState.passiveUpgrades[key];

    if (upgrade.level >= cfg.maxLevel) {
        showToast('Достигнут максимальный уровень', 'error');
        playErrorSound();
        return;
    }

    const cost = getPassiveCost(key);

    if (gameState.coins < cost) {
        showToast(`Нужно ещё ${formatNumber(cost - gameState.coins)} монет`, 'error');
        playErrorSound();
        return;
    }

    gameState.coins -= cost;
    upgrade.level += 1;

    playUpgradeSound();
    showToast(`${cfg.name}: уровень ${upgrade.level}!`);
    updateUI();
    updatePassiveUpgradesUI();
    saveGame();
}

function updatePassiveUpgradesUI() {
    const list = document.getElementById('passive-upgrades');
    if (!list) return;

    list.innerHTML = Object.keys(PASSIVE_CONFIG).map(key => {
        const cfg = PASSIVE_CONFIG[key];
        const lvl = gameState.passiveUpgrades[key].level;
        const cost = getPassiveCost(key);
        const isMaxed = lvl >= cfg.maxLevel;
        const canAfford = gameState.coins >= cost;

        return `
            <div class="upgrade-item" data-upgrade="${key}">
                <div class="upgrade-icon">🤖</div>
                <div class="upgrade-info">
                    <div class="upgrade-name">${cfg.name}</div>
                    <div class="upgrade-level">Уровень: ${lvl}/${cfg.maxLevel}</div>
                    <div class="upgrade-effect">+${cfg.effect} 🪙/сек</div>
                </div>
                <button class="upgrade-btn ${isMaxed ? 'maxed' : ''}" ${!canAfford || isMaxed ? 'disabled' : ''}>
                    ${isMaxed ? 'MAX' : `<span class="cost">${formatNumber(cost)}</span> 🪙`}
                </button>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.upgrade-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = e.target.closest('.upgrade-item');
            const key = item.getAttribute('data-upgrade');
            buyPassiveUpgrade(key);
        });
    });
}

function updatePassiveIndicator() {
    const indicator = document.getElementById('passive-income');
    if (indicator) {
        const income = getPassiveIncome();
        indicator.textContent = `🤖 +${formatNumber(income)} 🪙/сек`;
    }
}