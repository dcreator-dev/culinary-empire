function generateOrder() {
    if (gameState.orders.length >= 3) return;

    const availableDishes = ORDER_DISHES.filter(d => {
        const dishIndex = ORDER_DISHES.indexOf(d);
        return dishIndex <= gameState.level + 2;
    });

    const dish = availableDishes[Math.floor(Math.random() * availableDishes.length)];

    const order = {
        id: Date.now() + Math.random(),
        dishId: dish.id,
        dishName: dish.name,
        dishIcon: dish.icon,
        reward: Math.floor(dish.reward * (1 + gameState.level * 0.1)),
        repReward: dish.repReward,
        timeLeft: dish.time,
        maxTime: dish.time,
        createdAt: Date.now()
    };

    gameState.orders.push(order);
    saveGame();
    updateOrdersUI();
}

function completeOrder(orderId) {
    const orderIndex = gameState.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const order = gameState.orders[orderIndex];
    gameState.coins += order.reward;
    gameState.reputation += order.repReward;
    gameState.orders.splice(orderIndex, 1);

    playUpgradeSound();
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    showToast(`✅ Заказ выполнен! +${formatNumber(order.reward)} 🪙, +${order.repReward} ⭐`);
    updateUI();
    updateOrdersUI();
    saveGame();
}

function failOrder(orderId) {
    const orderIndex = gameState.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const order = gameState.orders[orderIndex];
    gameState.orders.splice(orderIndex, 1);

    const repPenalty = Math.floor(order.repReward / 2);
    gameState.reputation = Math.max(0, gameState.reputation - repPenalty);

    playErrorSound();
    showToast(`❌ Заказ провален! -${repPenalty} ⭐`, 'error');
    updateUI();
    updateOrdersUI();
    saveGame();
}

function updateOrdersUI() {
    const list = document.getElementById('orders-list');
    const badge = document.getElementById('orders-badge');

    if (!list) return;
    if (badge) badge.textContent = gameState.orders.length;

    if (gameState.orders.length === 0) {
        list.innerHTML = '<div class="empty-orders">Нет активных заказов. Загляните позже!</div>';
        return;
    }

    list.innerHTML = gameState.orders.map(order => {
        const isUrgent = order.timeLeft <= 10;
        const minutes = Math.floor(order.timeLeft / 60);
        const seconds = order.timeLeft % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        return `
            <div class="order-item ${isUrgent ? 'urgent' : ''}" data-order-id="${order.id}">
                <div class="order-icon">${order.dishIcon}</div>
                <div class="order-info">
                    <div class="order-name">${order.dishName}</div>
                    <div class="order-reward">+${formatNumber(order.reward)} 🪙  +${order.repReward} ⭐</div>
                    <div class="order-timer ${isUrgent ? 'urgent' : ''}">⏱️ ${timeStr}</div>
                </div>
                <button class="order-btn" data-complete="${order.id}">Готовить</button>
            </div>
        `;
    }).join('');
}

function startOrdersLoop() {
    setInterval(() => {
        let changed = false;
        gameState.orders.forEach(order => {
            order.timeLeft -= 1;
            if (order.timeLeft <= 0) {
                failOrder(order.id);
                changed = true;
            }
        });
        if (changed) updateUI();
        updateOrdersUI();
    }, 1000);

    setInterval(() => generateOrder(), 30000);
}