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
    // Таймер восстановления — компактно, внутри шкалы, без переноса
    const energyTimerEl = document.getElementById('energy-timer');
    if (energyTimerEl) {
        if (gameState.energy >= gameState.maxEnergy) {
            energyTimerEl.textContent = '(MAX)';
            energyTimerEl.style.color = '#00ff88';
        } else {
            const now = Date.now();
            const timeLeft = Math.max(0, 1 - ((now - lastEnergyRegen) / 1000));
            energyTimerEl.textContent = `(+1 ${timeLeft.toFixed(1)}с)`;
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
    updateOrdersUI(); // Инициализируем заказы

    // === 1. ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК ===
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            // Убираем активный класс у всех кнопок
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            // Добавляем нажатой
            item.classList.add('active');

            // Скрываем все вкладки
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            
            // Показываем нужную
            const tabId = `tab-${item.dataset.tab}`;
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }

            // Если открыли задания, обновляем список заказов
            if (item.dataset.tab === 'tasks') {
                renderOrdersInTab();
            }
        });
    });

    // === 2. ОБРАБОТЧИК ТАПА ===
    const tapZone = document.getElementById('tap-zone');
    const foodItem = document.getElementById('food-item');

    if (tapZone) {
        tapZone.addEventListener('pointerdown', (e) => {
            e.preventDefault();
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
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

            if (foodItem) {
                foodItem.classList.remove('tapped');
                void foodItem.offsetWidth; 
                foodItem.classList.add('tapped');
            }

            for (let i = 0; i < 3; i++) {
                setTimeout(() => createTapEffect(e.clientX || e.pageX, e.clientY || e.pageY), i * 60);
            }

            updateUI();
            updateUpgradeButtons();
            saveGame();
        });
    }

    // === 3. МОДАЛКА АПГРЕЙДОВ (из вкладки Бустер) ===
    const openUpgradesBtn = document.getElementById('open-upgrades-btn');
    const upgradesModal = document.getElementById('upgrades-modal');
    const closeUpgrades = document.getElementById('close-upgrades');

    if (openUpgradesBtn) {
        openUpgradesBtn.addEventListener('click', () => {
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
        // Делегирование для покупки
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

    // Переключение внутри модалки апгрейдов
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            document.getElementById('active-upgrades').style.display = tab === 'active' ? 'block' : 'none';
            document.getElementById('passive-upgrades').style.display = tab === 'passive' ? 'block' : 'none';
            if (tab === 'passive') updatePassiveUpgradesUI();
        });
    });

    // === 4. КНОПКА "ПРИГЛАСИТЬ ДРУГА" (из вкладки Профиль) ===
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const userId = tg.initDataUnsafe?.user?.id || '0';
            const shareText = `🍔 Я уже построил Кулинарную Империю уровня ${gameState.level}! Присоединяйся и получи бонус:`;
            const shareLink = `https://t.me/culinaryempire_bot?start=ref_${userId}`;
            
            tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`);
            
            gameState.coins += 500;
            showToast('🎁 Ссылка отправлена! +500 🪙 за активность');
            updateUI();
            saveGame();
            
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        });
    }

    // === 5. ИГРОВОЙ ЦИКЛ ===
    setInterval(() => {
        const now = Date.now();
        const income = getPassiveIncome();
        if (income > 0 && now - (gameState._lastPassiveIncome || 0) >= 1000) {
            gameState.coins += income;
            gameState._lastPassiveIncome = now;
        }

        if (gameState.energy >= gameState.maxEnergy) {
            lastEnergyRegen = now;
        } else if (now - lastEnergyRegen >= 1000) {
            gameState.energy = Math.min(gameState.maxEnergy, gameState.energy + 1);
            lastEnergyRegen = now;
            saveGame();
        }
        updateUI();
    }, 100);

    // Цикл заказов
    startOrdersLoop();
    if (gameState.orders.length === 0) {
        setTimeout(() => generateOrder(), 2000);
    }

    window.addEventListener('beforeunload', saveGame);
    console.log('✅ Игра инициализирована (Чистый UI)');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}