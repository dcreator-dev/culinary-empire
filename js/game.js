// Состояние игры, конфиги, сохранение

const UPGRADES_CONFIG = {
    laser:   { name: 'Лазерный резак',  baseCost: 100,  effect: 1,  maxLevel: 10 },
    plasma:  { name: 'Плазменный гриль', baseCost: 500,  effect: 2,  maxLevel: 10 },
    cyborg:  { name: 'Киборг-су-шеф',   baseCost: 2000, effect: 5,  maxLevel: 10 }
};

const PASSIVE_CONFIG = {
    helper:    { name: 'Помощник-повар',     baseCost: 1000,    effect: 1,   maxLevel: 10 },
    oven:      { name: 'Автоматическая печь', baseCost: 10000,   effect: 5,   maxLevel: 10 },
    drone:     { name: 'Дрон-доставщик',     baseCost: 100000,  effect: 20,  maxLevel: 10 },
    franchise: { name: 'Франшиза кафе',      baseCost: 1000000, effect: 50,  maxLevel: 10 },
    network:   { name: 'Сеть ресторанов',    baseCost: 10000000, effect: 150, maxLevel: 10 }
};

const ORDER_DISHES = [
    { id: 'burger',    name: 'Бургер',     icon: '🍔', reward: 100,  repReward: 5,  time: 60 },
    { id: 'pizza',     name: 'Пицца',      icon: '🍕', reward: 250,  repReward: 10, time: 90 },
    { id: 'sushi',     name: 'Суши',       icon: '🍣', reward: 400,  repReward: 15, time: 120 },
    { id: 'steak',     name: 'Стейк',      icon: '🥩', reward: 700,  repReward: 25, time: 150 },
    { id: 'ramen',     name: 'Рамен',      icon: '🍜', reward: 500,  repReward: 20, time: 100 },
    { id: 'croissant', name: 'Круассан',   icon: '🥐', reward: 300,  repReward: 12, time: 80 },
    { id: 'lobster',   name: 'Лобстер',    icon: '🦞', reward: 1500, repReward: 50, time: 180 },
    { id: 'cake',      name: 'Торт',       icon: '🎂', reward: 2000, repReward: 75, time: 200 }
];

const KITCHEN_LEVELS = [
    { level: 1,  name: 'УЛИЧНАЯ ТЕЛЕЖКА',       food: '🍔', repRequired: 0 },
    { level: 2,  name: 'КАФЕ',                  food: '🍕', repRequired: 50 },
    { level: 3,  name: 'ЗАКУСОЧНАЯ',            food: '🌭', repRequired: 150 },
    { level: 4,  name: 'СЕМЕЙНЫЙ РЕСТОРАН',     food: '🍝', repRequired: 400 },
    { level: 5,  name: 'СУШИ-БАР',              food: '🍣', repRequired: 800 },
    { level: 6,  name: 'СТЕЙК-ХАУС',            food: '🥩', repRequired: 1500 },
    { level: 7,  name: 'ФРАНЦУЗСКИЙ РЕСТОРАН',  food: '🥐', repRequired: 3000 },
    { level: 8,  name: 'ЯПОНСКИЙ РЕСТОРАН',     food: '🍜', repRequired: 6000 },
    { level: 9,  name: 'МИШЛЕНОВСКИЙ РЕСТОРАН', food: '🦞', repRequired: 12000 },
    { level: 10, name: 'КУЛИНАРНАЯ СИНГУЛЯРНОСТЬ', food: '✨', repRequired: 25000 }
];

const SAVE_KEY = 'culinaryEmpireSave_v3';

const defaultState = {
    coins: 0,
    crystals: 0,
    reputation: 0,
    energy: 1000,
    maxEnergy: 1000,
    level: 1,
    totalTaps: 0,
    orders: [],
    lastOrderTime: 0,
    lastOnline: Date.now(),
    upgrades: {
        laser:  { level: 0 },
        plasma: { level: 0 },
        cyborg: { level: 0 }
    },
    passiveUpgrades: {
        helper:    { level: 0 },
        oven:      { level: 0 },
        drone:     { level: 0 },
        franchise: { level: 0 },
        network:   { level: 0 }
    }
};

let gameState = JSON.parse(JSON.stringify(defaultState));

function getCoinsPerTap() {
    let sum = 1;
    for (const key in UPGRADES_CONFIG) {
        sum += gameState.upgrades[key].level * UPGRADES_CONFIG[key].effect;
    }
    return sum;
}

function getUpgradeCost(key) {
    const cfg = UPGRADES_CONFIG[key];
    const lvl = gameState.upgrades[key].level;
    return Math.floor(cfg.baseCost * Math.pow(1.5, lvl));
}

function getPassiveIncome() {
    let income = 0;
    for (const key in PASSIVE_CONFIG) {
        income += gameState.passiveUpgrades[key].level * PASSIVE_CONFIG[key].effect;
    }
    return income;
}

function getPassiveCost(key) {
    const cfg = PASSIVE_CONFIG[key];
    const lvl = gameState.passiveUpgrades[key].level;
    return Math.floor(cfg.baseCost * Math.pow(1.5, lvl));
}

function saveGame() {
    try {
        gameState.lastOnline = Date.now();
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    } catch (e) {
        console.warn('Не удалось сохранить:', e);
    }
}

function loadGame() {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            gameState = Object.assign({}, defaultState, parsed);
            gameState.upgrades = Object.assign({}, defaultState.upgrades, parsed.upgrades || {});
            gameState.passiveUpgrades = Object.assign({}, defaultState.passiveUpgrades, parsed.passiveUpgrades || {});
            if (!gameState.orders) gameState.orders = [];
        }
    } catch (e) {
        console.warn('Не удалось загрузить:', e);
        gameState = JSON.parse(JSON.stringify(defaultState));
    }
}

function formatNumber(n) {
    return Math.floor(n).toLocaleString('ru-RU');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}