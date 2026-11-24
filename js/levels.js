function getCurrentKitchenLevel() {
    let currentLevel = KITCHEN_LEVELS[0];
    for (const level of KITCHEN_LEVELS) {
        if (gameState.reputation >= level.repRequired) {
            currentLevel = level;
        } else {
            break;
        }
    }
    return currentLevel;
}

function updateKitchenVisuals(level) {
    const levelNameEl = document.getElementById('level-name');
    if (levelNameEl) levelNameEl.textContent = level.name;

    const levelEl = document.getElementById('level');
    if (levelEl) levelEl.textContent = level.level;

    const foodEl = document.querySelector('.placeholder-food');
    if (foodEl) foodEl.textContent = level.food;
}

function showLevelUpAnimation(oldLevel, newLevel) {
    const modal = document.createElement('div');
    modal.className = 'level-up-modal';
    modal.innerHTML = `
        <div class="level-up-content">
            <div class="level-up-badge">🎉 НОВЫЙ УРОВЕНЬ!</div>
            <div class="level-up-numbers">
                <span class="old-level">${oldLevel}</span>
                <span class="arrow">→</span>
                <span class="new-level">${newLevel.level}</span>
            </div>
            <div class="level-up-name">${newLevel.name}</div>
            <div class="level-up-food">${newLevel.food}</div>
            <button class="level-up-btn" id="close-level-up">Отлично!</button>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);

    document.getElementById('close-level-up').addEventListener('click', () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    });
}

function checkLevelUp() {
    const currentLevel = getCurrentKitchenLevel();
    if (currentLevel.level !== gameState.level) {
        const oldLevel = gameState.level;
        gameState.level = currentLevel.level;
        updateKitchenVisuals(currentLevel);
        showLevelUpAnimation(oldLevel, currentLevel);
        saveGame();
    }
}