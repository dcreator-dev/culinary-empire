// Уровни кухни и ручное открытие

function getCurrentKitchenData() {
    return KITCHEN_LEVELS.find(l => l.level === gameState.level) || KITCHEN_LEVELS[0];
}

function updateKitchenVisuals(levelData) {
    const levelNameEl = document.getElementById('level-name');
    if (levelNameEl) levelNameEl.textContent = levelData.name;

    const levelEl = document.getElementById('level');
    if (levelEl) levelEl.textContent = levelData.level;

    const foodContainer = document.querySelector('.placeholder-food');
    if (foodContainer) {
        const imgPath = KITCHEN_IMAGES[levelData.level];
        if (imgPath) {
            foodContainer.innerHTML = `<img src="${imgPath}" alt="${levelData.name}" class="food-img">`;
        } else {
            foodContainer.textContent = levelData.food; // fallback на эмодзи
        }
    }
}

function showLevelUpAnimation(oldLevel, newLevelData) {
    const modal = document.createElement('div');
    modal.className = 'level-up-modal';
    modal.innerHTML = `
        <div class="level-up-content">
            <div class="level-up-badge">🎉 НОВАЯ КУХНЯ ОТКРЫТА!</div>
            <div class="level-up-numbers">
                <span class="old-level">${oldLevel}</span>
                <span class="arrow">→</span>
                <span class="new-level">${newLevelData.level}</span>
            </div>
            <div class="level-up-name">${newLevelData.name}</div>
            <div class="level-up-food">${newLevelData.food}</div>
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

function renderKitchenProgress() {
    const currentData = getCurrentKitchenData();
    const nextData = KITCHEN_LEVELS.find(l => l.level === gameState.level + 1);

    const nameEl = document.getElementById('current-kitchen-name');
    const currentRepEl = document.getElementById('current-rep');
    const requiredRepEl = document.getElementById('required-rep');
    const progressFill = document.getElementById('kitchen-progress-fill');
    const unlockBtn = document.getElementById('unlock-kitchen-btn');
    const maxMsg = document.getElementById('max-kitchen-msg');
    const statLevelEl = document.getElementById('stat-level');

    if (nameEl) nameEl.textContent = currentData.name;
    if (currentRepEl) currentRepEl.textContent = gameState.reputation;
    if (statLevelEl) statLevelEl.textContent = gameState.level;

    if (nextData) {
        const req = nextData.repRequired;
        if (requiredRepEl) requiredRepEl.textContent = req;

        const pct = Math.min(100, (gameState.reputation / req) * 100);
        if (progressFill) progressFill.style.width = pct + '%';

        if (unlockBtn) {
            if (gameState.reputation >= req) {
                unlockBtn.disabled = false;
                unlockBtn.textContent = `🔓 Открыть: ${nextData.name}`;
            } else {
                unlockBtn.disabled = true;
                unlockBtn.textContent = `Нужно ещё ${req - gameState.reputation} ⭐`;
            }
        }
        if (maxMsg) maxMsg.style.display = 'none';
        if (unlockBtn) unlockBtn.style.display = 'block';
    } else {
        if (requiredRepEl) requiredRepEl.textContent = 'MAX';
        if (progressFill) progressFill.style.width = '100%';
        if (unlockBtn) unlockBtn.style.display = 'none';
        if (maxMsg) maxMsg.style.display = 'block';
    }
}

function tryUnlockNextKitchen() {
    const nextData = KITCHEN_LEVELS.find(l => l.level === gameState.level + 1);
    
    if (!nextData) return;

    if (gameState.reputation >= nextData.repRequired) {
        const oldLevel = gameState.level;
        gameState.level = nextData.level;
        
        updateKitchenVisuals(nextData);
        showLevelUpAnimation(oldLevel, nextData);
        
        saveGame();
        renderKitchenProgress();
        updateUI();
        
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
    } else {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        }
    }
}