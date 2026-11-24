// Telegram
const tg = window.Telegram.WebApp || { expand: () => {} };
if (tg.expand) tg.expand();

let lastEnergyRegen = Date.now();

// Инициализация Telegram
if (tg.initDataUnsafe?.user) {
    console.log('👤 Пользователь:', tg.initDataUnsafe.user.first_name);
} else {
    console.log('⚠️ Запущено вне Telegram');
}

if (tg.colorScheme) {
    document.body.style.background = tg.themeParams.bg_color 
        ? tg.themeParams.bg_color 
        : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
}

tg.ready();

function updateUI() {
    setText('coins-count', formatNumber(gameState.coins));
    setText('crystals-count', formatNumber(gameState.crystals));
    setText('reputation-count', formatNumber(gameState.reputation));
    setText('energy-count', formatNumber(Math.floor(gameState.energy)));
    setText('max-energy', formatNumber(gameState.maxEnergy));
    setText('level', gameState.level);
    setText('stat-taps', formatNumber(gameState.totalTaps));
    setText('stat-level', gameState.level);

    const fill = document.getElementById('energy-fill');
    if (fill) {
        const pct = (gameState.energy / gameState.maxEnergy) * 100;
        fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }

    updatePassiveIndicator();

    // Таймер энергии
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
        // Обновляем статистику рефералов
    const referralCountEl = document.getElementById('referral-count');
    const referralEarnedEl = document.getElementById('referral-earned');
    if (referralCountEl && gameState.referrals) {
        referralCountEl.textContent = gameState.referrals.count;
    }
    if (referralEarnedEl && gameState.referrals) {
        referralEarnedEl.textContent = formatNumber(gameState.referrals.earned);
    }
}

function createTapEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'tap-effect';
    effect.textContent = `+${getCoinsPerTap()}`;

    // Получаем границы картинки
    const foodItem = document.getElementById('food-item');
    const rect = foodItem.getBoundingClientRect();

    // Ограничиваем точку нажатия рамками картинки
    const clampedX = Math.max(rect.left, Math.min(x, rect.right));
    const clampedY = Math.max(rect.top, Math.min(y, rect.bottom));

    // Добавляем небольшое случайное смещение для красоты
    const offsetX = (Math.random() - 0.5) * 30;
    const offsetY = (Math.random() - 0.5) * 30;

    const finalX = clampedX + offsetX;
    const finalY = clampedY + offsetY;

    // Случайное направление разлёта
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 60;
    const tx = Math.cos(angle) * distance;

    effect.style.left = finalX + 'px';
    effect.style.top = finalY + 'px';
    effect.style.setProperty('--tx', tx + 'px');

    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 800);
}

function init() {
    loadGame();

    const initialLevel = getCurrentKitchenData();
    updateKitchenVisuals(initialLevel);

    updateUI();
    updateUpgradeButtons();
    renderOrdersInTab();
    renderKitchenProgress();

    // === 1. ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК ===
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            
            const tabId = `tab-${item.dataset.tab}`;
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }

            if (item.dataset.tab === 'tasks') {
                renderOrdersInTab();
            }
            if (item.dataset.tab === 'profile') {
                renderKitchenProgress();
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

    // === 3. МОДАЛКА АПГРЕЙДОВ ===
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

        // === 4. КНОПКА "ПРИГЛАСИТЬ ДРУГА" (только генерация ссылки) ===
    const shareBtn = document.getElementById('share-btn');
    const referralCountEl = document.getElementById('referral-count');
    const referralEarnedEl = document.getElementById('referral-earned');
    
    // Инициализация реферальных данных
    if (!gameState.referrals) {
        gameState.referrals = {
            count: 0,
            earned: 0
        };
    }
    
    function updateReferralStats() {
        if (referralCountEl) referralCountEl.textContent = gameState.referrals.count;
        if (referralEarnedEl) referralEarnedEl.textContent = formatNumber(gameState.referrals.earned);
    }
    
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const userId = tg.initDataUnsafe?.user?.id || '0';
            const userName = tg.initDataUnsafe?.user?.first_name || 'Друг';
            
            const shareText = `🍔 Я уже построил Кулинарную Империю уровня ${gameState.level}! Присоединяйся и получи бонус:`;
            const shareLink = `https://t.me/culinaryempire_bot?start=ref_${userId}`;
            
            tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`);
            
            // ❌ НЕ начисляем монеты за клик! Только за реального друга.
            showToast('🎁 Ссылка скопирована! Отправь её другу.');
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    }
    
    // Обновляем статистику при загрузке
    updateReferralStats();

    // === 5. КНОПКА ОТКРЫТИЯ КУХНИ ===
    const unlockKitchenBtn = document.getElementById('unlock-kitchen-btn');
    if (unlockKitchenBtn) {
        unlockKitchenBtn.addEventListener('click', () => {
            tryUnlockNextKitchen();
        });
    }

    // === 6. ИГРОВОЙ ЦИКЛ ===
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

        // === 7. МАГАЗИН STARS ===
    const shopBtn = document.getElementById('shop-btn');
    const shopModal = document.getElementById('shop-modal');
    const closeShop = document.getElementById('close-shop');

    if (shopBtn) {
        shopBtn.addEventListener('click', () => {
            shopModal.classList.add('active');
        });
    }

    if (closeShop) {
        closeShop.addEventListener('click', () => shopModal.classList.remove('active'));
    }

    if (shopModal) {
        shopModal.addEventListener('click', (e) => {
            if (e.target === shopModal) shopModal.classList.remove('active');
        });

        // Обработка покупок
        shopModal.addEventListener('click', (e) => {
            const btn = e.target.closest('.shop-btn');
            if (!btn) return;

            const item = btn.closest('.shop-item');
            const product = item.getAttribute('data-product');

            // Здесь будет отправка инвойса через Telegram Stars API
            // Пока просто показываем уведомление
            showToast(`🛒 Покупка: ${product}. Stars API в разработке.`);
            
            // TODO: Здесь будет реальный вызов tg.sendInvoice()
            // Пример:
            // if (product === 'coins_small') {
            //     sendStarsInvoice(50, '5000 монет', 'coins_small');
            // }
        });
    }

        // === 8. ЕЖЕДНЕВНЫЕ БОНУСЫ ===
    const claimDailyBtn = document.getElementById('claim-daily-btn');
    const dailyStatus = document.getElementById('daily-bonus-status');
    
    // Массив наград по дням (7 дней подряд)
    const DAILY_REWARDS = [
        { day: 1, coins: 500,  text: 'День 1: +500 🪙' },
        { day: 2, coins: 1000, text: 'День 2: +1000 🪙' },
        { day: 3, coins: 2000, text: 'День 3: +2000 🪙' },
        { day: 4, coins: 3000, text: 'День 4: +3000 🪙' },
        { day: 5, coins: 5000, text: 'День 5: +5000 🪙' },
        { day: 6, coins: 7500, text: 'День 6: +7500 🪙' },
        { day: 7, coins: 10000, text: 'День 7: +10000 🪙 🎉' }
    ];
    
    // Инициализация ежедневных данных
    if (!gameState.dailyBonus) {
        gameState.dailyBonus = {
            lastClaimDate: null,
            streak: 0,
            totalEarned: 0
        };
    }
    
    function checkDailyStatus() {
        const today = new Date().toDateString();
        const lastClaim = gameState.dailyBonus.lastClaimDate;
        
        if (lastClaim === today) {
            // Уже забрал сегодня
            claimDailyBtn.disabled = true;
            claimDailyBtn.textContent = '✅ Уже забрал';
            dailyStatus.textContent = `Серия: ${gameState.dailyBonus.streak} дней подряд`;
        } else {
            // Можно забрать
            claimDailyBtn.disabled = false;
            const nextDay = Math.min(gameState.dailyBonus.streak + 1, 7);
            claimDailyBtn.textContent = `Забрать награду (День ${nextDay})`;
            dailyStatus.textContent = `Серия: ${gameState.dailyBonus.streak} дней подряд`;
        }
    }
    
    if (claimDailyBtn) {
        claimDailyBtn.addEventListener('click', () => {
            const today = new Date().toDateString();
            const lastClaim = gameState.dailyBonus.lastClaimDate;
            
            if (lastClaim === today) {
                showToast('⏰ Награда уже получена сегодня!', 'error');
                return;
            }
            
            // Проверяем, был ли вчерашний день
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();
            
            if (lastClaim === yesterdayStr) {
                // Продолжаем серию
                gameState.dailyBonus.streak = Math.min(gameState.dailyBonus.streak + 1, 7);
            } else {
                // Начинаем новую серию
                gameState.dailyBonus.streak = 1;
            }
            
            // Начисляем награду
            const reward = DAILY_REWARDS[gameState.dailyBonus.streak - 1];
            gameState.coins += reward.coins;
            gameState.dailyBonus.totalEarned += reward.coins;
            gameState.dailyBonus.lastClaimDate = today;
            
            showToast(`🎉 ${reward.text}! Серия: ${gameState.dailyBonus.streak} дней`);
            updateUI();
            checkDailyStatus();
            saveGame();
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        });
    }
    
    // Проверяем статус при загрузке
    checkDailyStatus();    
    updateReferralStats();

    // Цикл заказов
    startOrdersLoop();
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