// Telegram
const tg = window.Telegram.WebApp || { expand: () => {} };
if (tg.expand) tg.expand();
// --- Telegram: применяем тему пользователя ---
if (tg.colorScheme) {
    document.body.style.background = tg.themeParams.bg_color 
        ? tg.themeParams.bg_color 
        : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
}
let lastEnergyRegen = Date.now();
// Сообщаем Telegram, что приложение готово
tg.ready();

// --- Telegram: получаем имя пользователя ---
const tgUser = tg.initDataUnsafe?.user;
if (tgUser) {
    console.log('👤 Пользователь Telegram:', tgUser.first_name, tgUser.username);
    
    // Персонализируем приветствие
    const levelInfo = document.querySelector('.level-info');
    if (levelInfo && tgUser.first_name) {
        levelInfo.innerHTML = `⚡ LEVEL <span id="level">1</span> • <span id="level-name">УЛИЧНАЯ ТЕЛЕЖКА</span> ⚡<br><span style="font-size:12px; color:#aaa;">Привет, ${tgUser.first_name}! 👋</span>`;
    }
} else {
    console.log('⚠️ Запущено вне Telegram');
}

// --- Telegram: включаем Haptic Feedback ---
if (tg.HapticFeedback) {
    console.log('✅ Haptic Feedback доступен');
}

function updateUI() {
    setText('coins-count', formatNumber(gameState.coins));
    setText('crystals-count', formatNumber(gameState.crystals));
    setText('reputation-count', formatNumber(gameState.reputation));
    setText('energy-count', formatNumber(Math.floor(gameState.energy)));
    setText('max-energy', formatNumber(gameState.maxEnergy));
    setText('level', gameState.level);

    const fill = document.getElementById('energy-fill');
    if (fill) {
        const pct = (gameState.energy / gameState.maxEnergy) * 100;
        fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }
    const energyTimerEl = document.getElementById('energy-timer');
    if (energyTimerEl) {
        if (gameState.energy >= gameState.maxEnergy) {
            energyTimerEl.textContent = '(MAX)';
            energyTimerEl.style.color = '#00ff88';
        } else {
            const now = Date.now();
            const timeLeft = Math.max(0, 1 - ((now - lastEnergyRegen) / 1000)).toFixed(1);
            energyTimerEl.textContent = `(+1 через ${timeLeft}с)`;
            energyTimerEl.style.color = '#ffd700';
        }
    }

    updatePassiveIndicator();
    checkLevelUp();
}

function createTapEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'tap-effect';
    effect.textContent = `+${getCoinsPerTap()}`;

    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 60;
    const tx = Math.cos(angle) * distance;

    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    effect.style.setProperty('--tx', tx + 'px');

    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 800);
}

function init() {
    loadGame();

    const initialLevel = getCurrentKitchenLevel();
    updateKitchenVisuals(initialLevel);

    updateUI();
    updateUpgradeButtons();

    // Тап по зоне еды
    const tapZone = document.getElementById('tap-zone');
    const foodItem = document.getElementById('food-item');

    if (tapZone) {
    // Тап по зоне еды (используем pointerdown для мгновенной реакции на мобильных)
    const tapZone = document.getElementById('tap-zone');
    const foodItem = document.getElementById('food-item');

    if (tapZone) {
        tapZone.addEventListener('pointerdown', (e) => {
            e.preventDefault(); // Предотвращаем зум и выделение

            if (gameState.energy <= 0) {
                showToast('Энергия закончилась!', 'error');
                if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
                return;
            }

            const gain = getCoinsPerTap();
            gameState.coins += gain;
            gameState.energy = Math.max(0, gameState.energy - 1);
            gameState.totalTaps += 1;

            playTapSound();

            // Вибрация при тапе (теперь сработает гарантированно)
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }

            // Исправление "залипания" анимации: сбрасываем класс и запускаем заново
            if (foodItem) {
                foodItem.classList.remove('tapped');
                void foodItem.offsetWidth; // Магия: принудительный reflow браузера
                foodItem.classList.add('tapped');
            }

            // Эффект вылетающих цифр
            for (let i = 0; i < 3; i++) {
                setTimeout(() => createTapEffect(e.clientX || e.pageX, e.clientY || e.pageY), i * 60);
            }

            updateUI();
            updateUpgradeButtons();
            saveGame();
        });
    }
    }

    // Модалка апгрейдов
    const upgradesBtn = document.getElementById('upgrades-btn');
    const upgradesModal = document.getElementById('upgrades-modal');
    const closeUpgrades = document.getElementById('close-upgrades');

    if (upgradesBtn) {
        upgradesBtn.addEventListener('click', () => {
            upgradesModal.classList.add('active');
            updateUpgradeButtons();
        });
    }
    if (closeUpgrades) {
        closeUpgrades.addEventListener('click', () => upgradesModal.classList.remove('active'));
    }
    if (upgradesModal) {
        upgradesModal.addEventListener('click', (e) => {
            if (e.target === upgradesModal) upgradesModal.classList.remove('active');
        });

        // Делегирование для активных апгрейдов
        upgradesModal.addEventListener('click', (e) => {
            const btn = e.target.closest('.upgrade-btn');
            if (!btn || btn.disabled) return;

            const item = btn.closest('.upgrade-item');
            if (!item) return;

            const key = item.getAttribute('data-upgrade');
            if (key && UPGRADES_CONFIG[key]) {
                buyUpgrade(key);
            }
        });
    }

    // Переключение вкладок апгрейдов
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.getAttribute('data-tab');
            const activeList = document.getElementById('active-upgrades');
            const passiveList = document.getElementById('passive-upgrades');

            if (tab === 'active') {
                activeList.style.display = 'block';
                passiveList.style.display = 'none';
            } else {
                activeList.style.display = 'none';
                passiveList.style.display = 'block';
                updatePassiveUpgradesUI();
            }
        });
    });

    // Модалка заказов
    const ordersBtn = document.getElementById('orders-btn');
    const ordersModal = document.getElementById('orders-modal');
    const closeOrders = document.getElementById('close-orders');

    if (ordersBtn) {
        ordersBtn.addEventListener('click', () => {
            ordersModal.classList.add('active');
            updateOrdersUI();
        });
    }
    if (closeOrders) {
        closeOrders.addEventListener('click', () => ordersModal.classList.remove('active'));
    }
    if (ordersModal) {
        ordersModal.addEventListener('click', (e) => {
            if (e.target === ordersModal) ordersModal.classList.remove('active');
        });

        ordersModal.addEventListener('click', (e) => {
            const btn = e.target.closest('.order-btn');
            if (!btn) return;

            const orderId = parseFloat(btn.getAttribute('data-complete'));
            if (orderId) {
                completeOrder(orderId);
            }
        });
    }

    // Навигация по вкладкам
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Пассивный доход
    // Игровой цикл: пассивный доход и восстановление энергии (проверяем каждые 100мс для плавности)
    setInterval(() => {
        const now = Date.now();
        
        // 1. Пассивный доход (раз в секунду)
        const income = getPassiveIncome();
        if (income > 0 && now - (gameState._lastPassiveIncome || 0) >= 1000) {
            gameState.coins += income;
            gameState._lastPassiveIncome = now;
        }

        // 2. Восстановление энергии (1 ед. в секунду)
        if (gameState.energy < gameState.maxEnergy && (now - lastEnergyRegen) >= 1000) {
            gameState.energy = Math.min(gameState.maxEnergy, gameState.energy + 1);
            lastEnergyRegen = now;
            saveGame(); // Сохраняем при восстановлении
        }

        // Обновляем UI каждый тик (для плавного таймера)
        updateUI();
    }, 100);

    // Автосохранение
    setInterval(saveGame, 10000);

    // Цикл заказов
    startOrdersLoop();

    // Первый заказ через 2 секунды
    if (gameState.orders.length === 0) {
        setTimeout(() => generateOrder(), 2000);
    }

    window.addEventListener('beforeunload', saveGame);

    console.log('✅ Игра инициализирована');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}