// ── Canvas Setup ──
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 420;
const H = 640;
canvas.width = W;
canvas.height = H;

// ── DOM Elements ──
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreDisplay = document.getElementById('scoreDisplay');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const medalEl = document.getElementById('medal');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const startBestScoreEl = document.getElementById('startBestScore');

canvas.parentElement.style.position = 'relative';

// ── Localization (Словарь) ──
let currentLang = localStorage.getItem('flappyLang') || 'ru';
const TRANSLATIONS = {
  ru: {
    pause: '⏸ Пауза', resume: '▶ Продолжить', toMenu: '🏠 В меню', shop: '🛒 Магазин',
    close: 'Закрыть', balance: 'Баланс', equipped: 'Выбрано', equip: 'Надеть', buy: 'Купить',
    score: 'Счет:', best: 'Рекорд:', paused: 'ПАУЗА', start: 'Старт', restart: 'Рестарт', menu: 'Меню',
    diff: { easy: 'Легко', medium: 'Средне', hard: 'Сложно' },
    cat: { birds: 'Птицы', pipes: 'Трубы', bgs: 'Фоны', counters: 'Счетчик' },
    skins: {
      bird_default: 'Желтая', bird_red: 'Злая Красная', bird_neon: 'Неоновая', bird_dark: 'Темный рыцарь',
      pipe_default: 'Зеленые', pipe_fire: 'Огненные', pipe_cyber: 'Киберпанк',
      bg_default: 'Классика', bg_desert: 'Марс', bg_neon: 'Неоновый город',
      counter_default: 'Обычный', counter_fire: 'Огонь 🔥', counter_star: 'Звезда ⭐', counter_skull: 'Череп 💀'
    }
  },
  en: {
    pause: '⏸ Pause', resume: '▶ Resume', toMenu: '🏠 Menu', shop: '🛒 Shop',
    close: 'Close', balance: 'Balance', equipped: 'Equipped', equip: 'Equip', buy: 'Buy',
    score: 'Score:', best: 'Best:', paused: 'PAUSED', start: 'Start', restart: 'Restart', menu: 'Menu',
    diff: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    cat: { birds: 'Birds', pipes: 'Pipes', bgs: 'Backgrounds', counters: 'Counters' },
    skins: {
      bird_default: 'Yellow', bird_red: 'Angry Red', bird_neon: 'Neon', bird_dark: 'Dark Knight',
      pipe_default: 'Green', pipe_fire: 'Fire', pipe_cyber: 'Cyberpunk',
      bg_default: 'Classic', bg_desert: 'Mars', bg_neon: 'Neon City',
      counter_default: 'Default', counter_fire: 'Fire 🔥', counter_star: 'Star ⭐', counter_skull: 'Skull 💀'
    }
  }
};

// ── Game State ──
const STATES = { MENU: 0, PLAYING: 1, DEAD: 2, PAUSED: 3 }; 
let state = STATES.MENU;
let score = 0; let bestScore = 0; let frameCount = 0; let flashAlpha = 0; let flashColor = '#ffffff';
let gameOverTimer; 

// ── Economy & Skins ──
let coins = parseInt(localStorage.getItem('flappyCoins')) || 0;

let unlocked = JSON.parse(localStorage.getItem('flappyUnlocked')) || {};
unlocked.birds = unlocked.birds || ['bird_default'];
unlocked.pipes = unlocked.pipes || ['pipe_default'];
unlocked.bgs = unlocked.bgs || ['bg_default'];
unlocked.counters = unlocked.counters || ['counter_default'];

let activeSkins = JSON.parse(localStorage.getItem('flappyActive')) || {};
activeSkins.bird = activeSkins.bird || 'bird_default';
activeSkins.pipe = activeSkins.pipe || 'pipe_default';
activeSkins.bg = activeSkins.bg || 'bg_default';
activeSkins.counter = activeSkins.counter || 'counter_default';

const SHOP_DATA = {
  birds: [
    { id: 'bird_default', price: 0, colors: ['#ffe135', '#f5a623'] },
    { id: 'bird_red', price: 50, colors: ['#ff4d4d', '#cc0000'] },
    { id: 'bird_neon', price: 150, colors: ['#0ff', '#f0f'] },
    { id: 'bird_dark', price: 300, colors: ['#333', '#111'] }
  ],
  pipes: [
    { id: 'pipe_default', price: 0, colors: ['#3a9e3e', '#5ec862', '#4db851', '#2d7e31'] },
    { id: 'pipe_fire', price: 100, colors: ['#c93212', '#f5632a', '#e34714', '#8a1f09'] },
    { id: 'pipe_cyber', price: 250, colors: ['#1a053a', '#3d0a66', '#260447', '#0e0220'] }
  ],
  bgs: [
    { id: 'bg_default', price: 0 }, { id: 'bg_desert', price: 150 }, { id: 'bg_neon', price: 350 }
  ],
  counters: [
    { id: 'counter_default', price: 0, icon: '' },
    { id: 'counter_fire', price: 100, icon: '🔥' },
    { id: 'counter_star', price: 250, icon: '⭐' },
    { id: 'counter_skull', price: 400, icon: '💀' }
  ]
};

function saveProgress() {
  localStorage.setItem('flappyCoins', coins);
  localStorage.setItem('flappyUnlocked', JSON.stringify(unlocked));
  localStorage.setItem('flappyActive', JSON.stringify(activeSkins));
}

function updateScoreDisplay() {
  if (!scoreDisplay) return;
  const skinInfo = SHOP_DATA.counters.find(c => c.id === activeSkins.counter) || SHOP_DATA.counters[0];
  
  if (skinInfo.id === 'counter_default') {
    scoreDisplay.innerHTML = score;
    scoreDisplay.style.fontFamily = "sans-serif";
  } else {
    scoreDisplay.innerHTML = `
      <div style="position: relative; display: inline-flex; align-items: center; justify-content: center; font-family: sans-serif;">
        <span style="font-size: 80px; line-height: 1; filter: drop-shadow(0px 4px 5px rgba(0,0,0,0.6)); opacity: 0.85;">${skinInfo.icon}</span>
        <span style="position: absolute; font-size: 42px; font-weight: 900; color: #fff; text-shadow: 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 15px rgba(255,255,255,0.8); z-index: 10;">${score}</span>
      </div>
    `;
  }
}

// ── UI Overlay: Coins, Shop & Lang ──
const uiOverlay = document.createElement('div');
uiOverlay.style.position = 'absolute'; uiOverlay.style.top = '10px'; uiOverlay.style.right = '10px';
uiOverlay.style.zIndex = '100'; uiOverlay.style.display = 'flex'; uiOverlay.style.flexDirection = 'column'; uiOverlay.style.alignItems = 'flex-end';

const coinsDisplay = document.createElement('div');
coinsDisplay.style.color = '#ffd700'; coinsDisplay.style.fontWeight = 'bold'; coinsDisplay.style.fontSize = '20px'; coinsDisplay.style.textShadow = '2px 2px 0 #000';
coinsDisplay.innerHTML = `🪙 <span id="coinCount">${coins}</span>`;
uiOverlay.appendChild(coinsDisplay);

const buttonsContainer = document.createElement('div');
buttonsContainer.style.display = 'flex'; buttonsContainer.style.gap = '5px'; buttonsContainer.style.marginTop = '10px';

const openShopBtn = document.createElement('button');
openShopBtn.style.padding = '8px 12px'; openShopBtn.style.backgroundColor = '#ff9800'; openShopBtn.style.color = '#fff';
openShopBtn.style.border = '2px solid #fff'; openShopBtn.style.borderRadius = '8px'; openShopBtn.style.cursor = 'pointer'; openShopBtn.style.fontWeight = 'bold';
buttonsContainer.appendChild(openShopBtn);

const langBtn = document.createElement('button');
langBtn.style.padding = '8px 12px'; langBtn.style.backgroundColor = '#3498db'; langBtn.style.color = '#fff';
langBtn.style.border = '2px solid #fff'; langBtn.style.borderRadius = '8px'; langBtn.style.cursor = 'pointer'; langBtn.style.fontWeight = 'bold';
buttonsContainer.appendChild(langBtn);

uiOverlay.appendChild(buttonsContainer);
canvas.parentElement.appendChild(uiOverlay);

function updateCoinsUI() { document.getElementById('coinCount').textContent = coins; }

// ── UI Overlay: Pause & Exit ──
const pauseBtn = document.createElement('button');
pauseBtn.style.position = 'absolute'; pauseBtn.style.top = '10px'; pauseBtn.style.left = '10px';
pauseBtn.style.padding = '8px 12px'; pauseBtn.style.fontSize = '14px'; pauseBtn.style.fontWeight = 'bold'; pauseBtn.style.color = '#fff';
pauseBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; pauseBtn.style.border = '2px solid #fff'; pauseBtn.style.borderRadius = '8px'; pauseBtn.style.cursor = 'pointer'; pauseBtn.style.display = 'none'; pauseBtn.style.zIndex = '1000';

const exitToMenuBtn = document.createElement('button');
exitToMenuBtn.style.position = 'absolute'; exitToMenuBtn.style.top = '50px'; exitToMenuBtn.style.left = '10px';
exitToMenuBtn.style.padding = '8px 12px'; exitToMenuBtn.style.fontSize = '14px'; exitToMenuBtn.style.fontWeight = 'bold'; exitToMenuBtn.style.color = '#fff';
exitToMenuBtn.style.backgroundColor = '#e74c3c'; exitToMenuBtn.style.border = '2px solid #fff'; exitToMenuBtn.style.borderRadius = '8px'; exitToMenuBtn.style.cursor = 'pointer'; exitToMenuBtn.style.display = 'none'; exitToMenuBtn.style.zIndex = '1000';

canvas.parentElement.appendChild(pauseBtn);
canvas.parentElement.appendChild(exitToMenuBtn);

pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePause(); });
exitToMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); returnToMenu(); });
langBtn.addEventListener('click', (e) => { 
  e.stopPropagation(); currentLang = currentLang === 'ru' ? 'en' : 'ru'; 
  localStorage.setItem('flappyLang', currentLang); applyLanguage();
});

function togglePause() {
  const t = TRANSLATIONS[currentLang];
  if (state === STATES.PLAYING) { state = STATES.PAUSED; pauseBtn.textContent = t.resume; exitToMenuBtn.style.display = 'block'; } 
  else if (state === STATES.PAUSED) { state = STATES.PLAYING; pauseBtn.textContent = t.pause; exitToMenuBtn.style.display = 'none'; }
}

function returnToMenu() {
  clearTimeout(gameOverTimer);
  state = STATES.MENU; score = 0; pipes = []; particles = []; bird.reset(); tunnelCount = 0; pipesSpawned = 0;
  pauseBtn.style.display = 'none'; exitToMenuBtn.style.display = 'none'; uiOverlay.style.display = 'flex';
  
  if (startScreen) { startScreen.classList.add('active'); startScreen.style.display = 'flex'; }
  if (gameOverScreen) { gameOverScreen.style.display = 'none'; gameOverScreen.classList.remove('active'); }
  if (scoreDisplay) scoreDisplay.style.display = 'none'; updateBestScoreUI();
}

// ── Shop Screen UI ──
const shopScreen = document.createElement('div');
shopScreen.style.position = 'absolute'; shopScreen.style.top = '0'; shopScreen.style.left = '0';
shopScreen.style.width = '100%'; shopScreen.style.height = '100%'; 
shopScreen.style.backgroundColor = 'rgba(0,0,0,0.9)'; 
shopScreen.style.zIndex = '2000'; shopScreen.style.display = 'none'; 
shopScreen.style.flexDirection = 'column'; shopScreen.style.color = '#fff'; 
shopScreen.style.overflowY = 'auto'; shopScreen.style.padding = '20px'; 
shopScreen.style.boxSizing = 'border-box';
canvas.parentElement.appendChild(shopScreen);

function renderShop() {
  const t = TRANSLATIONS[currentLang];
  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1 style="margin:0; font-size:24px;">${t.shop.replace('🛒 ', '')}</h1>
      <button id="closeShopBtn" style="padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">${t.close}</button>
    </div>
    <h2 style="color: #ffd700; text-align: center; margin-top:0;">${t.balance} ${coins} 🪙</h2>
  `;
  const categories = [ 
    { key: 'birds', title: t.cat.birds, activeKey: 'bird' }, 
    { key: 'pipes', title: t.cat.pipes, activeKey: 'pipe' }, 
    { key: 'bgs', title: t.cat.bgs, activeKey: 'bg' },
    { key: 'counters', title: t.cat.counters, activeKey: 'counter' }
  ];

  categories.forEach(cat => {
    html += `<h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;">${cat.title}</h3><div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">`;
    SHOP_DATA[cat.key].forEach(item => {
      const isUnlocked = unlocked[cat.key].includes(item.id); const isActive = activeSkins[cat.activeKey] === item.id; const skinName = t.skins[item.id];
      let btnHtml = '';
      if (isActive) btnHtml = `<button disabled style="background:#4caf50; color:white; border:none; padding:5px; border-radius:5px;">${t.equipped}</button>`;
      else if (isUnlocked) btnHtml = `<button onclick="equipSkin('${cat.activeKey}', '${item.id}')" style="background:#2196f3; color:white; border:none; padding:5px; border-radius:5px; cursor:pointer;">${t.equip}</button>`;
      else {
        const canBuy = coins >= item.price;
        btnHtml = `<button onclick="buySkin('${cat.key}', '${item.id}', ${item.price})" style="background:${canBuy ? '#ff9800' : '#777'}; color:white; border:none; padding:5px; border-radius:5px; ${canBuy ? 'cursor:pointer;' : ''}">${t.buy} (${item.price}🪙)</button>`;
      }
      html += `<div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; width: 45%; box-sizing: border-box; text-align: center;"><div style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">${skinName}</div>${btnHtml}</div>`;
    }); html += `</div>`;
  });
  shopScreen.innerHTML = html; document.getElementById('closeShopBtn').onclick = () => { shopScreen.style.display = 'none'; };
}

window.buySkin = function(category, id, price) { if (coins >= price && !unlocked[category].includes(id)) { coins -= price; unlocked[category].push(id); saveProgress(); updateCoinsUI(); renderShop(); } };
window.equipSkin = function(type, id) { activeSkins[type] = id; saveProgress(); renderShop(); updateScoreDisplay(); };
openShopBtn.addEventListener('click', () => { renderShop(); shopScreen.style.display = 'flex'; });

function triggerFlash(color = '#ffffff', intensity = 0.8) { flashColor = color; flashAlpha = Math.max(flashAlpha, intensity); }

// ── Difficulty Selection UI ──
let currentDifficulty = 1.0;
const diffContainer = document.createElement('div');
diffContainer.style.display = 'flex'; diffContainer.style.justifyContent = 'center'; diffContainer.style.gap = '8px'; diffContainer.style.marginTop = '20px';

const diffKeys = [ { key: 'easy', val: 1.0, color: '#4caf50' }, { key: 'medium', val: 1.2, color: '#ff9800' }, { key: 'hard', val: 1.5, color: '#f44336' } ];

function setDifficulty(val) {
  currentDifficulty = val; PIPE_SPEED = 2.91 * val; bird.gravity = 0.22 * val * val; bird.flapPower = -4.8 * val; 
  bestScore = parseInt(localStorage.getItem(`flappyBest_${val}`) || (val === 1.0 ? localStorage.getItem('flappyBest') : null) || '0');
  updateBestScoreUI();
  Array.from(diffContainer.children).forEach(btn => {
    if (parseFloat(btn.dataset.val) === val) { btn.style.opacity = '1'; btn.style.transform = 'scale(1.08)'; btn.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)'; } 
    else { btn.style.opacity = '0.5'; btn.style.transform = 'scale(1)'; btn.style.boxShadow = 'none'; }
  });
}

diffKeys.forEach(d => {
  const btn = document.createElement('button'); btn.dataset.key = d.key; btn.dataset.val = d.val;
  btn.style.padding = '8px 12px'; btn.style.border = '2px solid #fff'; btn.style.borderRadius = '8px';
  btn.style.backgroundColor = d.color; btn.style.color = 'white'; btn.style.cursor = 'pointer'; btn.style.fontWeight = 'bold';
  btn.addEventListener('click', (e) => { e.stopPropagation(); setDifficulty(d.val); }); diffContainer.appendChild(btn);
});
if (startScreen) startScreen.appendChild(diffContainer);

function applyLanguage() {
  const t = TRANSLATIONS[currentLang]; langBtn.textContent = currentLang === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN';
  openShopBtn.textContent = t.shop; exitToMenuBtn.textContent = t.toMenu; pauseBtn.textContent = state === STATES.PAUSED ? t.resume : t.pause;
  Array.from(diffContainer.children).forEach(btn => { btn.textContent = t.diff[btn.dataset.key]; });
  if (startBtn) startBtn.textContent = t.start; if (restartBtn) restartBtn.textContent = t.restart; if (menuBtn) menuBtn.textContent = t.menu;
  updateBestScoreUI(); if (shopScreen.style.display === 'flex') renderShop();
}

// ── Background Engine ──
let dayCycleTime = 0; let cloudOffsetX = 0; let groundOffsetX = 0;
const clouds = []; for (let i = 0; i < 6; i++) clouds.push({ x: Math.random() * W * 1.5, y: 40 + Math.random() * 180, w: 60 + Math.random() * 80, h: 25 + Math.random() * 20, baseSpeed: 0.23 + Math.random() * 0.46, alpha: 0.3 + Math.random() * 0.4 });
const stars = []; for (let i = 0; i < 40; i++) stars.push({ x: Math.random() * W, y: Math.random() * (H - 80), size: 0.5 + Math.random() * 1.5, offset: Math.random() * 100 });
function lerp(a, b, t) { return a + (b - a) * t; }

function drawBackground() {
  const GROUND_H = 80; let skyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H); let showStars = false;
  if (activeSkins.bg === 'bg_desert') { skyGrad.addColorStop(0, '#c75822'); skyGrad.addColorStop(1, '#e0a96d'); } 
  else if (activeSkins.bg === 'bg_neon') { skyGrad.addColorStop(0, '#0a0026'); skyGrad.addColorStop(1, '#3b0059'); showStars = true; } 
  else {
    const PALETTES = [ { top: [78, 197, 241], bot: [168, 230, 255] }, { top: [255, 126, 95], bot: [254, 180, 123] }, { top: [11, 29, 58], bot: [26, 54, 93] } ];
    let phase = (dayCycleTime % 1.0) * 3; let index = Math.floor(phase); let t = phase - index; let blend = t > 0.5 ? (t - 0.5) * 2 : 0; 
    let c1 = PALETTES[index]; let c2 = PALETTES[(index + 1) % 3];
    let topR = Math.round(lerp(c1.top[0], c2.top[0], blend)); let topG = Math.round(lerp(c1.top[1], c2.top[1], blend)); let topB = Math.round(lerp(c1.top[2], c2.top[2], blend));
    let botR = Math.round(lerp(c1.bot[0], c2.bot[0], blend)); let botG = Math.round(lerp(c1.bot[1], c2.bot[1], blend)); let botB = Math.round(lerp(c1.bot[2], c2.bot[2], blend));
    skyGrad.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`); skyGrad.addColorStop(1, `rgb(${botR}, ${botG}, ${botB})`);
    if (index === 1 && blend > 0) showStars = true; if (index === 2) showStars = true;
  }
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H - GROUND_H);
  if (showStars || activeSkins.bg === 'bg_neon') { stars.forEach(s => { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(dayCycleTime * 50 + s.offset); ctx.fillStyle = activeSkins.bg === 'bg_neon' ? (Math.random() > 0.5 ? '#0ff' : '#f0f') : '#ffffff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1; }
  if (activeSkins.bg !== 'bg_neon') { clouds.forEach(c => { ctx.globalAlpha = c.alpha; ctx.fillStyle = activeSkins.bg === 'bg_desert' ? '#f5d1a4' : '#fff'; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(c.x - c.w * 0.3, c.y + 4, c.w * 0.3, c.h * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.25, c.y + 3, c.w * 0.28, c.h * 0.38, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }); }
}
function drawGround() {
  const GROUND_H = 80; const gy = H - GROUND_H; const groundGrad = ctx.createLinearGradient(0, gy, 0, H);
  if (activeSkins.bg === 'bg_desert') { groundGrad.addColorStop(0, '#e68a00'); groundGrad.addColorStop(1, '#804d00'); ctx.fillStyle = groundGrad; ctx.fillRect(0, gy, W, GROUND_H); } 
  else if (activeSkins.bg === 'bg_neon') { groundGrad.addColorStop(0, '#110033'); groundGrad.addColorStop(1, '#05001a'); ctx.fillStyle = groundGrad; ctx.fillRect(0, gy, W, GROUND_H); ctx.fillStyle = '#0ff'; for (let i = -1; i < W / 24 + 2; i++) { ctx.fillRect(i * 24 - groundOffsetX, gy, 2, GROUND_H); } ctx.fillRect(0, gy, W, 2); } 
  else { groundGrad.addColorStop(0, '#8bc34a'); groundGrad.addColorStop(1, '#689f38'); ctx.fillStyle = groundGrad; ctx.fillRect(0, gy, W, GROUND_H); ctx.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = -1; i < W / 24 + 2; i++) ctx.fillRect(i * 24 - groundOffsetX, gy + 14, 12, GROUND_H - 14); ctx.fillStyle = '#9ccc65'; ctx.fillRect(0, gy, W, 4); }
}

// ── Bird (С уникальными деталями скинов!) ──
const bird = {
  x: 80, y: H / 2, w: 38, h: 28, vy: 0, gravity: 0.22, flapPower: -4.8, rotation: 0, flapFrame: 0, trail: [],
  reset() { this.y = H / 2; this.vy = 0; this.rotation = 0; this.flapFrame = 0; this.trail = []; },
  flap() { this.vy = this.flapPower; this.flapFrame = 8; },
  update() {
    this.vy += this.gravity; this.y += this.vy; if (this.flapFrame > 0) this.flapFrame--;
    this.rotation += (Math.min(this.vy * (3.65 / currentDifficulty), 90) - this.rotation) * 0.11;
    
    // Цвет следа зависит от скина
    let trailColor = '#ffe082';
    if (activeSkins.bird === 'bird_red') trailColor = '#ff4d4d';
    if (activeSkins.bird === 'bird_neon') trailColor = Math.random() > 0.5 ? '#0ff' : '#f0f';
    if (activeSkins.bird === 'bird_dark') trailColor = '#555';

    if (frameCount % 2 === 0) this.trail.push({ x: this.x, y: this.y, alpha: 0.7, size: 4 + Math.random() * 4, color: trailColor });
    this.trail = this.trail.filter(p => { p.alpha -= 0.035 * currentDifficulty; p.x -= 1.73 * currentDifficulty; p.size *= 0.96; return p.alpha > 0; });
  },
  draw() {
    const skinInfo = SHOP_DATA.birds.find(b => b.id === activeSkins.bird) || SHOP_DATA.birds[0];
    
    // Отрисовка следа
    this.trail.forEach(p => { 
      ctx.globalAlpha = p.alpha * 0.5; 
      ctx.fillStyle = p.color; 
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); 
      if (activeSkins.bird === 'bird_neon') {
         ctx.shadowColor = p.color; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      }
    }); 
    ctx.globalAlpha = 1;
    
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate((this.rotation * Math.PI) / 180);
    
    // Уши Бэтмена для Темного Рыцаря (рисуются под телом)
    if (activeSkins.bird === 'bird_dark') {
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(-2, -20); ctx.lineTo(4, -13); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, -13); ctx.lineTo(9, -19); ctx.lineTo(12, -10); ctx.fill();
    }

    // Тело
    const bodyGrad = ctx.createLinearGradient(0, -this.h/2, 0, this.h/2); bodyGrad.addColorStop(0, skinInfo.colors[0]); bodyGrad.addColorStop(1, skinInfo.colors[1]);
    ctx.fillStyle = bodyGrad; ctx.beginPath(); ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    
    // Крыло
    const wingY = this.flapFrame > 4 ? -8 : this.flapFrame > 0 ? -3 : 2;
    ctx.fillStyle = skinInfo.colors[1]; ctx.beginPath(); ctx.ellipse(-6, wingY, 12, 7, -0.2, 0, Math.PI * 2); ctx.fill();
    
    // Детали морды
    if (activeSkins.bird === 'bird_neon') {
      // Киберпанк визор
      ctx.fillStyle = '#0ff'; ctx.fillRect(4, -9, 14, 7);
      ctx.fillStyle = '#f0f'; ctx.fillRect(4, -6, 14, 2);
      ctx.shadowColor = '#0ff'; ctx.shadowBlur = 10; ctx.fillRect(4, -9, 14, 7); ctx.shadowBlur = 0;
    } else {
      // Обычный глаз
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(10, -5, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = activeSkins.bird === 'bird_red' ? '#cc0000' : '#222'; ctx.beginPath(); ctx.arc(12, -4, 3.5, 0, Math.PI * 2); ctx.fill();
      
      // Злые брови
      if (activeSkins.bird === 'bird_red') {
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(16, -7); ctx.lineTo(16, -10); ctx.lineTo(4, -15); ctx.fill();
      }
    }

    // Клюв
    ctx.fillStyle = activeSkins.bird === 'bird_dark' ? '#777' : '#e74c3c'; 
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(24, 2); ctx.lineTo(14, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  },
  getBounds() { return { x: this.x - this.w / 2 + 5, y: this.y - this.h / 2 + 4, w: this.w - 10, h: this.h - 8 }; }
};

// ── УМНАЯ ГЕНЕРАЦИЯ ТРУБ И ПАСХАЛКА 999 ──
const PIPE_W = 62; const PIPE_GAP = 150; let PIPE_SPEED = 2.91; const PIPE_SPACING = 200; 
let pipes = []; let tunnelCount = 0; let tunnelTopH = 0;
let pipesSpawned = 0; 

function spawnPipe() {
  const GROUND_H = 80; const minY = 80; const maxY = H - GROUND_H - PIPE_GAP - 80; 
  let topH; let isMoving = false; let currentSpacing = PIPE_SPACING;
  
  pipesSpawned++;
  const isNest = (pipesSpawned === 999); 

  if (currentDifficulty >= 1.5) {
    if (tunnelCount > 0) { topH = tunnelTopH; tunnelCount--; currentSpacing = 145; } 
    else { const rand = Math.random(); if (rand < 0.25 && !isNest) { tunnelCount = 2 + Math.floor(Math.random() * 2); tunnelTopH = minY + Math.random() * (maxY - minY); topH = tunnelTopH; currentSpacing = 145; } else { topH = minY + Math.random() * (maxY - minY); if (rand > 0.6 && !isNest) isMoving = true; } }
  } else { topH = minY + Math.random() * (maxY - minY); }

  let extraX = 0;
  if (pipes.length > 0) {
    const lastPipe = pipes[pipes.length - 1]; const deltaY = Math.abs(topH - lastPipe.topH);
    if (deltaY > 40) extraX = Math.min((deltaY - 40) * 1.2, 180);
  }

  pipes.push({ x: W + 20 + extraX, topH: topH, scored: false, isMoving: isMoving, moveSpeed: 0.8 + Math.random() * 1.2, moveDir: Math.random() > 0.5 ? 1 : -1, minTop: Math.max(minY, topH - 50), maxTop: Math.min(maxY, topH + 50), spacing: currentSpacing, isNest: isNest });
}

function drawPipe(pipe) {
  const GROUND_H = 80; const topH = pipe.topH; const botY = topH + PIPE_GAP; const botH = H - GROUND_H - botY; const capW = 8; const capH = 26;
  const skinInfo = SHOP_DATA.pipes.find(p => p.id === activeSkins.pipe) || SHOP_DATA.pipes[0]; const colors = skinInfo.colors;
  
  const getGrad = (yStart, height) => { const grad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0); grad.addColorStop(0, colors[0]); grad.addColorStop(0.3, colors[1]); grad.addColorStop(0.7, colors[2]); grad.addColorStop(1, colors[3]); return grad; };
  
  ctx.fillStyle = getGrad(0, topH); ctx.fillRect(pipe.x, 0, PIPE_W, topH); ctx.beginPath(); ctx.roundRect(pipe.x - capW/2, topH - capH, PIPE_W + capW, capH, [0, 0, 6, 6]); ctx.fill();
  ctx.fillStyle = getGrad(botY, botH); ctx.fillRect(pipe.x, botY, PIPE_W, botH); ctx.beginPath(); ctx.roundRect(pipe.x - capW/2, botY, PIPE_W + capW, capH, [6, 6, 0, 0]); ctx.fill();

  // Дополнительные визуальные эффекты для труб
  if (activeSkins.pipe === 'pipe_fire') {
    // Отрисовка языков пламени
    ctx.fillStyle = '#ffb300';
    for(let i=0; i<4; i++) {
      ctx.beginPath(); ctx.moveTo(pipe.x + i*15 + 5, topH); ctx.lineTo(pipe.x + i*15 + 12, topH + 15 + Math.sin(frameCount*0.2 + i)*10); ctx.lineTo(pipe.x + i*15 + 20, topH); ctx.fill();
      ctx.beginPath(); ctx.moveTo(pipe.x + i*15 + 5, botY); ctx.lineTo(pipe.x + i*15 + 12, botY - 15 - Math.sin(frameCount*0.2 + i)*10); ctx.lineTo(pipe.x + i*15 + 20, botY); ctx.fill();
    }
  } else if (activeSkins.pipe === 'pipe_cyber') {
    // Отрисовка неоновых линий (микросхем)
    ctx.fillStyle = '#0ff';
    ctx.shadowColor = '#0ff'; ctx.shadowBlur = 10;
    ctx.fillRect(pipe.x + 12, 0, 3, topH - capH);
    ctx.fillRect(pipe.x + PIPE_W - 20, botY + capH, 3, botH - capH);
    ctx.fillStyle = '#f0f';
    ctx.shadowColor = '#f0f';
    ctx.fillRect(pipe.x + PIPE_W - 15, 0, 2, topH - capH);
    ctx.fillRect(pipe.x + 15, botY + capH, 2, botH - capH);
    ctx.shadowBlur = 0;
  }

  if (pipe.isNest) {
    const cx = pipe.x + PIPE_W / 2; const cy = botY; 
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.ellipse(cx - 10, cy - 8, 7, 10, -0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 10, cy - 8, 7, 10, 0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy - 12, 7, 10, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#8B4513'; ctx.beginPath(); ctx.ellipse(cx, cy, 32, 16, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#A0522D'; ctx.beginPath(); ctx.ellipse(cx, cy, 26, 11, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3e1f08'; ctx.beginPath(); ctx.ellipse(cx, cy - 2, 20, 7, 0, 0, Math.PI*2); ctx.fill();
  }
}

// ── Particles & Collision ──
let particles = [];
function spawnScoreParticle() { for (let i = 0; i < 10; i++) particles.push({ x: bird.x + 10, y: bird.y - 20, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 5, alpha: 1, size: 3 + Math.random() * 6, color: '#ffd700' }); }
function spawnDeathParticles() { for (let i = 0; i < 24; i++) particles.push({ x: bird.x, y: bird.y, vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.5) * 9, alpha: 1, size: 3 + Math.random() * 6, color: '#ff4d4d' }); }
function spawnMegaConfetti() {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  for (let i = 0; i < 120; i++) particles.push({ x: bird.x, y: bird.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, alpha: 1, size: 4 + Math.random() * 8, color: colors[Math.floor(Math.random() * colors.length)] });
}
function updateParticles() { particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.135 * currentDifficulty; p.alpha -= 0.023 * currentDifficulty; p.size *= 0.97; return p.alpha > 0; }); }
function drawParticles() { particles.forEach(p => { ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1; }
function checkCollision() { const b = bird.getBounds(); const groundY = H - 80; if (b.y + b.h > groundY || b.y < 0) return true; for (const p of pipes) { const botY = p.topH + PIPE_GAP; const capW = 8; if (rectsOverlap(b, { x: p.x, y: 0, w: PIPE_W, h: p.topH }) || rectsOverlap(b, { x: p.x - capW/2, y: p.topH - 26, w: PIPE_W + capW, h: 26 }) || rectsOverlap(b, { x: p.x, y: botY, w: PIPE_W, h: H - 80 - botY }) || rectsOverlap(b, { x: p.x - capW/2, y: botY, w: PIPE_W + capW, h: 26 })) return true; } return false; }
function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

// ── Game Actions ──
let shakeAmount = 0;
function startGame() {
  clearTimeout(gameOverTimer);
  state = STATES.PLAYING; score = 0; pipes = []; particles = []; tunnelCount = 0; pipesSpawned = 0; bird.reset(); frameCount = 0; shakeAmount = 0;
  pauseBtn.style.display = 'block'; exitToMenuBtn.style.display = 'none'; uiOverlay.style.display = 'none';
  
  if (startScreen) { startScreen.classList.remove('active'); startScreen.style.display = 'none'; }
  if (gameOverScreen) { gameOverScreen.style.display = 'none'; gameOverScreen.classList.remove('active'); }
  if (scoreDisplay) { scoreDisplay.style.display = 'block'; updateScoreDisplay(); }
  spawnPipe();
}

function updateBestScoreUI() {
  const t = TRANSLATIONS[currentLang]; const val = Number(bestScore) || 0;
  if (bestScoreEl) bestScoreEl.textContent = `${t.best} ${val}`;
  if (startBestScoreEl) startBestScoreEl.textContent = String(val);
}

function gameOver() {
  const t = TRANSLATIONS[currentLang];
  state = STATES.DEAD; shakeAmount = 12; pauseBtn.style.display = 'none'; exitToMenuBtn.style.display = 'none'; uiOverlay.style.display = 'flex';
  triggerFlash('#ff4d4d', 0.9); spawnDeathParticles();

  if (score > bestScore) { bestScore = score; localStorage.setItem(`flappyBest_${currentDifficulty}`, bestScore); if (currentDifficulty === 1.0) localStorage.setItem('flappyBest', bestScore); updateBestScoreUI(); }

  clearTimeout(gameOverTimer);
  gameOverTimer = setTimeout(() => {
    if (state !== STATES.DEAD) return;
    if (scoreDisplay) scoreDisplay.style.display = 'none';
    if (gameOverScreen) { gameOverScreen.style.display = 'flex'; gameOverScreen.classList.add('active'); }
    if (finalScoreEl) finalScoreEl.textContent = `${t.score} ${score}`;
    if (bestScoreEl) bestScoreEl.textContent = `${t.best} ${bestScore}`;
  }, 600);
}

function handleFlap() {
  if (shopScreen.style.display === 'flex') return;
  if (state === STATES.MENU) { startGame(); bird.flap(); } 
  else if (state === STATES.PLAYING) { bird.flap(); } 
  else if (state === STATES.PAUSED) { togglePause(); }
}

// ── Клавиатура + Секретные Чит-Коды ──
const keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  
  // ЗАКРЫТИЕ МАГАЗИНА ИЛИ ПАУЗА ПО ESC
  if (e.code === 'Escape') { 
    e.preventDefault(); 
    if (shopScreen.style.display === 'flex') {
      shopScreen.style.display = 'none';
    } else if (state === STATES.PLAYING || state === STATES.PAUSED) {
      togglePause(); 
    }
  }

  // ПАСХАЛКА ТЕЛЕПОРТ (зажать 6 и 7 во время игры)
  if (keys['Digit6'] && keys['Digit7']) {
    if (state === STATES.PLAYING) {
      score = 993; pipesSpawned = 993; updateScoreDisplay(); triggerFlash('#f0f', 0.8); 
      keys['Digit6'] = false; keys['Digit7'] = false; 
    }
  }

  // ПАСХАЛКА СБРОС (зажать 4 и 2 в главном меню)
  if (keys['Digit4'] && keys['Digit2']) {
    if (state === STATES.MENU) {
      localStorage.clear();
      location.reload(); 
    }
  }

  if (e.code === 'Space' || e.code === 'ArrowUp') { 
    e.preventDefault(); 
    if (state === STATES.DEAD && gameOverScreen && gameOverScreen.style.display !== 'none') { startGame(); bird.flap(); } else { handleFlap(); } 
  }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

canvas.addEventListener('click', handleFlap);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleFlap(); });
if (startBtn) startBtn.addEventListener('click', () => { startGame(); bird.flap(); });
if (restartBtn) restartBtn.addEventListener('click', () => { startGame(); bird.flap(); });
if (menuBtn) menuBtn.addEventListener('click', returnToMenu);

setDifficulty(1.0); applyLanguage(); updateBestScoreUI();

// ── Logic & Render Loop ──
let menuBobTime = 0; 
function updateLogic() {
  if (state === STATES.PAUSED) return; 
  frameCount++; dayCycleTime += 0.0002 * currentDifficulty; 
  if (shakeAmount > 0) { shakeAmount *= 0.85; if (shakeAmount < 0.5) shakeAmount = 0; }
  clouds.forEach(c => { if (state === STATES.PLAYING) c.x -= c.baseSpeed * currentDifficulty; if (c.x + c.w < -20) c.x = W + 40; });
  if (state === STATES.PLAYING) groundOffsetX = (groundOffsetX + PIPE_SPEED) % 24;

  if (state === STATES.MENU) { menuBobTime += 0.047 * currentDifficulty; bird.y = H / 2 + Math.sin(menuBobTime) * 15; bird.flapFrame = Math.sin(menuBobTime * 3) > 0 ? 6 : 0; bird.rotation = 0; }
  if (state === STATES.PLAYING) {
    bird.update();
    pipes.forEach(p => { p.x -= PIPE_SPEED; if (p.isMoving) { p.topH += p.moveSpeed * p.moveDir; if (p.topH > p.maxTop) { p.topH = p.maxTop; p.moveDir = -1; } else if (p.topH < p.minTop) { p.topH = p.minTop; p.moveDir = 1; } } });
    pipes = pipes.filter(p => p.x + PIPE_W > -20);
    const lastPipe = pipes[pipes.length - 1]; const spacingRequired = lastPipe ? lastPipe.spacing : PIPE_SPACING;
    if (!lastPipe || lastPipe.x < W - spacingRequired) spawnPipe();
    
    pipes.forEach(p => {
      if (!p.scored && p.x + PIPE_W < bird.x) {
        p.scored = true; score++; 
        
        // ПОБЕДА (ГНЕЗДО ДОСТИГНУТО)
        if (p.isNest) {
          coins += 999; triggerFlash('#ffd700', 1.0); spawnMegaConfetti(); gameOver(); 
        } else {
          coins += currentDifficulty >= 1.5 ? 3 : (currentDifficulty >= 1.2 ? 2 : 1); spawnScoreParticle();
        }
        
        saveProgress(); updateCoinsUI(); 
        if (scoreDisplay) { updateScoreDisplay(); scoreDisplay.classList.add('pop'); setTimeout(() => scoreDisplay.classList.remove('pop'), 100); }
      }
    });
    updateParticles(); if (checkCollision()) gameOver();
  }
  if (state === STATES.DEAD) { bird.vy += bird.gravity; bird.y += bird.vy; bird.rotation = 90; if (bird.y > H - 80 - bird.h / 2) { bird.y = H - 80 - bird.h / 2; bird.vy = 0; } updateParticles(); }
}

let lastTime = performance.now(); let accumulator = 0; const TIME_STEP = 1000 / 60;
function gameLoop(timestamp) {
  let deltaTime = timestamp - lastTime; lastTime = timestamp; if (deltaTime > 250) deltaTime = 250; 
  accumulator += deltaTime; while (accumulator >= TIME_STEP) { updateLogic(); accumulator -= TIME_STEP; }

  ctx.clearRect(0, 0, W, H); let shakeX = 0, shakeY = 0;
  if (shakeAmount > 0) { shakeX = (Math.random() - 0.5) * shakeAmount; shakeY = (Math.random() - 0.5) * shakeAmount; }
  
  ctx.save(); ctx.translate(shakeX, shakeY); drawBackground();
  if (state === STATES.MENU || state === STATES.PLAYING || state === STATES.PAUSED) { pipes.forEach(drawPipe); bird.draw(); if (state === STATES.PLAYING) drawParticles(); }
  if (state === STATES.DEAD) { pipes.forEach(drawPipe); bird.draw(); drawParticles(); } drawGround();

  if (state === STATES.PAUSED) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; 
    ctx.fillText(TRANSLATIONS[currentLang].paused, W / 2, H / 2);
  }
  if (flashAlpha > 0) { ctx.fillStyle = flashColor; ctx.globalAlpha = flashAlpha; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1.0; flashAlpha -= 0.05; if (flashAlpha < 0) flashAlpha = 0; }
  ctx.restore(); requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);