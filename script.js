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
const shopBtn = document.getElementById('shopBtn');
const closeShopBtn = document.getElementById('closeShopBtn');
const shopScreen = document.getElementById('shopScreen');
const startBestScoreEl = document.getElementById('startBestScore');

// ── Game State ──
const STATES = { MENU: 0, PLAYING: 1, DEAD: 2 };
const SKIN_KEY = 'flappyOwnedSkins';
const SELECTED_SKIN_KEY = 'flappySelectedSkin';
const SKINS = {
  classic: {
    name: 'Classic',
    bodyTop: '#ffe135',
    bodyBottom: '#f5a623',
    wing: '#f0c040',
    hasHat: false
  },
  red: {
    name: 'Red Bird',
    bodyTop: '#ff8a80',
    bodyBottom: '#ff5252',
    wing: '#ffb199',
    hasHat: false
  },
  blue: {
    name: 'Blue Bird',
    bodyTop: '#8ec5ff',
    bodyBottom: '#3c82ff',
    wing: '#b9d8ff',
    hasHat: false
  },
  green: {
    name: 'Green Bird',
    bodyTop: '#9be15d',
    bodyBottom: '#2ecb74',
    wing: '#c8f5a7',
    hasHat: false
  },
  hat: {
    name: 'Bird with Hat',
    bodyTop: '#f7d387',
    bodyBottom: '#f39c12',
    wing: '#fce4b2',
    hatStyle: 'hat',
    cost: 60
  },
  cap: {
    name: 'Bird with Cap',
    bodyTop: '#ff9a9e',
    bodyBottom: '#f6416c',
    wing: '#ffc1c7',
    hatStyle: 'cap',
    cost: 75
  },
  crown: {
    name: 'Bird with Crown',
    bodyTop: '#fff09b',
    bodyBottom: '#f6c445',
    wing: '#fff5bd',
    hatStyle: 'crown',
    cost: 100
  },
  wizard: {
    name: 'Wizard Bird',
    bodyTop: '#c5a3ff',
    bodyBottom: '#7048c6',
    wing: '#dfccff',
    hatStyle: 'wizard',
    cost: 125
  },
  gold: {
    name: 'Golden Bird',
    bodyTop: '#fff6a3',
    bodyBottom: '#d99b00',
    wing: '#ffe27a',
    cost: 999
  }
};
let state = STATES.MENU;
let score = 0;
let bestScore = parseInt(localStorage.getItem('flappyBest') || '0');
let totalCoins = parseInt(localStorage.getItem('flappyCoins') || '0');
let ownedSkins = ['classic'];
let selectedSkin = localStorage.getItem(SELECTED_SKIN_KEY) || 'classic';
let frameCount = 0;
let flashAlpha = 0;
let flashColor = '#ffffff';

function triggerFlash(color = '#ffffff', intensity = 0.8) {
  flashColor = color;
  flashAlpha = Math.max(flashAlpha, intensity);
}

// ── Difficulty Selection UI (Создается автоматически) ──
let currentDifficulty = 1.0;
const diffContainer = document.createElement('div');
diffContainer.style.display = 'flex';
diffContainer.style.justifyContent = 'center';
diffContainer.style.gap = '8px';
diffContainer.style.marginTop = '20px';
diffContainer.style.zIndex = '100';

const difficulties = [
  { label: 'Легко', val: 1.0, color: '#4caf50' },
  { label: 'Средне', val: 1.2, color: '#ff9800' },
  { label: 'Сложно', val: 1.5, color: '#f44336' }
];

function setDifficulty(val) {
  currentDifficulty = val;
  PIPE_SPEED = 2.91 * val;
  bird.gravity = 0.135 * val * val;
  bird.flapPower = -3.5 * val;
  
  // Загружаем рекорд для выбранной сложности (для Легко берем старый рекорд, если есть)
  bestScore = parseInt(localStorage.getItem(`flappyBest_${val}`) || (val === 1.0 ? localStorage.getItem('flappyBest') : null) || '0');
  updateBestScoreUI();

  // Визуальное обновление кнопок
  Array.from(diffContainer.children).forEach(btn => {
    if (parseFloat(btn.dataset.val) === val) {
      btn.style.opacity = '1';
      btn.style.transform = 'scale(1.08)';
      btn.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)';
    } else {
      btn.style.opacity = '0.5';
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = 'none';
    }
  });
}

difficulties.forEach(d => {
  const btn = document.createElement('button');
  btn.textContent = d.label;
  btn.dataset.val = d.val;
  btn.style.padding = '8px 12px';
  btn.style.border = '2px solid #fff';
  btn.style.borderRadius = '8px';
  btn.style.backgroundColor = d.color;
  btn.style.color = 'white';
  btn.style.cursor = 'pointer';
  btn.style.fontWeight = 'bold';
  btn.style.fontSize = '14px';
  btn.style.transition = 'all 0.2s';
  btn.style.fontFamily = 'inherit';
  
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setDifficulty(d.val);
  });
  
  diffContainer.appendChild(btn);
});

if (startScreen) {
  startScreen.appendChild(diffContainer);
}


// ── Day / Night Cycle Setup ──
let dayCycleTime = 0; 
const PALETTES = [
  { top: [78, 197, 241], bot: [168, 230, 255] }, 
  { top: [255, 126, 95], bot: [254, 180, 123] }, 
  { top: [11, 29, 58],   bot: [26, 54, 93] }     
];

const stars = [];
for (let i = 0; i < 40; i++) {
  stars.push({
    x: Math.random() * W,
    y: Math.random() * (H - 80),
    size: 0.5 + Math.random() * 1.5,
    offset: Math.random() * 100 
  });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ── Colors ──
const SKY_TOP = '#4ec5f1';
const SKY_BOT = '#a8e6ff';
const GROUND_TOP = '#8bc34a';
const GROUND_BOT = '#689f38';
const GROUND_H = 80;

// ── Bird ──
const bird = {
  x: 80,
  y: H / 2,
  w: 38,
  h: 28,
  vy: 0,
  gravity: 0.135,
  flapPower: -3.5, 
  rotation: 0,
  flapFrame: 0,
  trail: [],

  reset() {
    this.y = H / 2;
    this.vy = 0;
    this.rotation = 0;
    this.flapFrame = 0;
    this.trail = [];
  },

  flap() {
    this.vy = this.flapPower;
    this.flapFrame = 8;
  },

  update() {
    this.vy += this.gravity;
    this.y += this.vy;
    if (this.flapFrame > 0) this.flapFrame--;

    const targetRot = Math.min(this.vy * (3.65 / currentDifficulty), 90);
    this.rotation += (targetRot - this.rotation) * 0.11;

    // Trail particles
    if (frameCount % 2 === 0) {
      this.trail.push({
        x: this.x,
        y: this.y,
        alpha: 0.6,
        size: 4 + Math.random() * 3
      });
    }
    this.trail = this.trail.filter(p => {
      p.alpha -= 0.035 * currentDifficulty;
      p.x -= 1.73 * currentDifficulty;
      p.size *= 0.96;
      return p.alpha > 0;
    });
  },

  draw() {
    // Trail
    this.trail.forEach(p => {
      ctx.globalAlpha = p.alpha * 0.5;
      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    const skin = getSelectedSkin();

    // Body
    const bodyGrad = ctx.createLinearGradient(0, -this.h/2, 0, this.h/2);
    bodyGrad.addColorStop(0, skin.bodyTop);
    bodyGrad.addColorStop(1, skin.bodyBottom);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    const wingY = this.flapFrame > 4 ? -8 : this.flapFrame > 0 ? -3 : 2;
    ctx.fillStyle = skin.wing;
    ctx.beginPath();
    ctx.ellipse(-6, wingY, 12, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();

    drawHat(skin.hatStyle);

    // Eye (white)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(10, -5, 7, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(12, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(13.5, -6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(24, 2);
    ctx.lineTo(14, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },

  getBounds() {
    return {
      x: this.x - this.w / 2 + 5,
      y: this.y - this.h / 2 + 4,
      w: this.w - 10,
      h: this.h - 8
    };
  }
};

// ── Pipes ──
const PIPE_W = 62;
const PIPE_GAP = 150;
let PIPE_SPEED = 2.91; // Изменяется сложностью
const PIPE_SPACING = 200;
let pipes = [];

function loadShopState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SKIN_KEY) || '[]');
    ownedSkins = Array.isArray(saved) && saved.length ? saved : ['classic'];
    if (!ownedSkins.includes('classic')) ownedSkins.unshift('classic');
  } catch {
    ownedSkins = ['classic'];
  }

  if (!ownedSkins.includes(selectedSkin) || !SKINS[selectedSkin]) {
    selectedSkin = 'classic';
  }
}

function saveShopState() {
  localStorage.setItem(SKIN_KEY, JSON.stringify(ownedSkins));
  localStorage.setItem(SELECTED_SKIN_KEY, selectedSkin);
}

function saveCoins() {
  localStorage.setItem('flappyCoins', String(totalCoins));
}

function getSelectedSkin() {
  return SKINS[selectedSkin] || SKINS.classic;
}

function drawHat(style) {
  if (!style) return;

  if (style === 'hat') {
    ctx.fillStyle = '#d35400';
    ctx.fillRect(-6, -22, 28, 7);
    ctx.beginPath();
    ctx.moveTo(-4, -20);
    ctx.lineTo(20, -20);
    ctx.lineTo(14, -10);
    ctx.lineTo(2, -10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(6, -31, 12, 10);
    return;
  }

  if (style === 'cap') {
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(7, -15, 13, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-7, -16, 26, 5);
    ctx.fillStyle = '#ff8993';
    ctx.fillRect(13, -13, 12, 3);
    return;
  }

  if (style === 'crown') {
    ctx.fillStyle = '#f7c843';
    ctx.beginPath();
    ctx.moveTo(-8, -14);
    ctx.lineTo(-5, -29);
    ctx.lineTo(2, -21);
    ctx.lineTo(8, -31);
    ctx.lineTo(14, -21);
    ctx.lineTo(20, -28);
    ctx.lineTo(22, -14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(8, -19, 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (style === 'wizard') {
    ctx.fillStyle = '#51349b';
    ctx.beginPath();
    ctx.moveTo(-8, -13);
    ctx.lineTo(8, -38);
    ctx.lineTo(23, -13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8e6bd1';
    ctx.fillRect(-10, -15, 34, 6);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(8, -28, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function applyShopUpgrades() {
  bird.flapPower = -2.4;
  bird.gravity = 0.064;
}

function updateShopUI() {
  const coinsEl = document.getElementById('shopCoins');
  if (coinsEl) coinsEl.textContent = String(totalCoins);

  document.querySelectorAll('.shop-buy').forEach(button => {
    const key = button.dataset.skin;
    const owned = ownedSkins.includes(key);

    if (owned) {
      button.textContent = key === selectedSkin ? 'Selected' : 'Owned';
      button.disabled = key === selectedSkin;
      return;
    }

    const cost = SKINS[key].cost || 50;
    button.textContent = String(cost);
    button.disabled = totalCoins < cost;
  });
}

function showMainMenu() {
  state = STATES.MENU;
  startScreen.classList.add('active');
  startScreen.style.display = 'flex';
  shopScreen.style.display = 'none';
  shopScreen.classList.remove('active');
  gameOverScreen.style.display = 'none';
  gameOverScreen.classList.remove('active');
  scoreDisplay.style.display = 'none';
  updateBestScoreUI();
  updateShopUI();
}

function buySkin(key) {
  if (!SKINS[key]) return;
  if (key === 'classic') return;

  if (ownedSkins.includes(key)) {
    selectedSkin = key;
    saveShopState();
    updateShopUI();
    return;
  }

  const cost = SKINS[key].cost || 50;
  if (totalCoins < cost) return;

  totalCoins -= cost;
  ownedSkins.push(key);
  selectedSkin = key;
  saveCoins();
  saveShopState();
  applyShopUpgrades();
  updateShopUI();
}

function drawCoinHud() {
  const coinX = 20;
  const coinY = 24;
  const coinR = 12;

  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = '#f5c542';
  ctx.arc(coinX + 10, coinY + 14, coinR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = '#fff2a8';
  ctx.arc(coinX + 14, coinY + 10, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '700 20px Outfit, sans-serif';
  ctx.fillText(`x${totalCoins}`, coinX + 30, coinY + 21);
  ctx.restore();
}

function spawnPipe() {
  const minY = 80;
  const maxY = H - GROUND_H - PIPE_GAP - 80;
  const topH = minY + Math.random() * (maxY - minY);
  const coinTypes = ['gold', 'gold', 'silver', 'diamond'];
  const type = coinTypes[Math.floor(Math.random() * coinTypes.length)];
  const coinX = W + 20 + PIPE_W / 2;
  pipes.push({
    x: W + 20,
    topH: topH,
    scored: false,
    coin: {
      x: coinX,
      y: topH + PIPE_GAP / 2,
      r: type === 'diamond' ? 12 : type === 'silver' ? 9 : 10,
      collected: false,
      type,
      phase: Math.random() * Math.PI * 2
    }
  });
}

function drawPipe(pipe) {
  const topH = pipe.topH;
  const botY = topH + PIPE_GAP;
  const botH = H - GROUND_H - botY;
  const capW = 8;
  const capH = 26;

  // Top pipe
  const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
  topGrad.addColorStop(0, '#3a9e3e');
  topGrad.addColorStop(0.3, '#5ec862');
  topGrad.addColorStop(0.7, '#4db851');
  topGrad.addColorStop(1, '#2d7e31');
  ctx.fillStyle = topGrad;
  ctx.fillRect(pipe.x, 0, PIPE_W, topH);

  // Top cap
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.roundRect(pipe.x - capW/2, topH - capH, PIPE_W + capW, capH, [0, 0, 6, 6]);
  ctx.fill();

  // Top pipe highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(pipe.x + 6, 0, 8, topH - capH);

  // Top pipe shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(pipe.x + PIPE_W - 10, 0, 6, topH - capH);

  // Bottom pipe
  const botGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
  botGrad.addColorStop(0, '#3a9e3e');
  botGrad.addColorStop(0.3, '#5ec862');
  botGrad.addColorStop(0.7, '#4db851');
  botGrad.addColorStop(1, '#2d7e31');
  ctx.fillStyle = botGrad;
  ctx.fillRect(pipe.x, botY, PIPE_W, botH);

  // Bottom cap
  ctx.beginPath();
  ctx.roundRect(pipe.x - capW/2, botY, PIPE_W + capW, capH, [6, 6, 0, 0]);
  ctx.fill();

  // Bottom pipe highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(pipe.x + 6, botY + capH, 8, botH - capH);

  // Bottom pipe shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(pipe.x + PIPE_W - 10, botY + capH, 6, botH - capH);
}

function drawCoin(coin) {
  if (!coin || coin.collected) return;

  const pipe = pipes.find(item => item.coin === coin);
  if (!pipe) return;

  const x = pipe.x + PIPE_W / 2;
  const bob = Math.sin((frameCount + x) * 0.12 + coin.phase) * 3;
  const colors = {
    gold: { main: '#ffd54a', inner: '#fff1a8', outline: 'rgba(124, 92, 0, 0.7)' },
    silver: { main: '#dfe8f7', inner: '#ffffff', outline: 'rgba(85, 104, 130, 0.7)' },
    diamond: { main: '#73e7ff', inner: '#effcff', outline: 'rgba(24, 90, 128, 0.7)' }
  };
  const color = colors[coin.type] || colors.gold;
  const y = coin.y + bob;

  ctx.beginPath();
  ctx.fillStyle = color.main;
  ctx.arc(x, y, coin.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = color.inner;
  ctx.arc(x - coin.r * 0.28, y - coin.r * 0.2, coin.r * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = color.outline;
  ctx.lineWidth = 2;
  ctx.arc(x, y, coin.r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.arc(x + coin.r * 0.15, y - coin.r * 0.15, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

// ── Background ──
let cloudOffsetX = 0;
let groundOffsetX = 0;

const clouds = [];
for (let i = 0; i < 6; i++) {
  clouds.push({
    x: Math.random() * W * 1.5,
    y: 40 + Math.random() * 180,
    w: 60 + Math.random() * 80,
    h: 25 + Math.random() * 20,
    baseSpeed: 0.23 + Math.random() * 0.46, // Базовая скорость
    alpha: 0.3 + Math.random() * 0.4
  });
}

function updateEnvironment() {
  clouds.forEach(c => {
    if (state === STATES.PLAYING) c.x -= c.baseSpeed * currentDifficulty;
    if (c.x + c.w < -20) c.x = W + 40;
  });

  if (state === STATES.PLAYING) groundOffsetX = (groundOffsetX + PIPE_SPEED) % 24;
}

function drawBackground() {
  let phase = (dayCycleTime % 1.0) * 3;
  let index = Math.floor(phase); 
  let t = phase - index; 
  let blend = t > 0.5 ? (t - 0.5) * 2 : 0; 

  let c1 = PALETTES[index];
  let c2 = PALETTES[(index + 1) % 3];

  let topR = Math.round(lerp(c1.top[0], c2.top[0], blend));
  let topG = Math.round(lerp(c1.top[1], c2.top[1], blend));
  let topB = Math.round(lerp(c1.top[2], c2.top[2], blend));

  let botR = Math.round(lerp(c1.bot[0], c2.bot[0], blend));
  let botG = Math.round(lerp(c1.bot[1], c2.bot[1], blend));
  let botB = Math.round(lerp(c1.bot[2], c2.bot[2], blend));

  const skyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
  skyGrad.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`);
  skyGrad.addColorStop(1, `rgb(${botR}, ${botG}, ${botB})`);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H - GROUND_H);

  let starAlpha = 0;
  if (index === 1) starAlpha = blend; 
  else if (index === 2) starAlpha = 1 - blend; 

  if (starAlpha > 0) {
    stars.forEach(s => {
      let a = starAlpha * (0.3 + 0.7 * Math.sin(dayCycleTime * 50 + s.offset));
      if (a < 0) a = 0;
      
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  clouds.forEach(c => {
    if (state === STATES.PLAYING) c.x -= c.speed;
    if (c.x + c.w < -20) c.x = W + 40;

    ctx.globalAlpha = c.alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x - c.w * 0.3, c.y + 4, c.w * 0.3, c.h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.25, c.y + 3, c.w * 0.28, c.h * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawGround() {
  if (state === STATES.PLAYING) groundOffsetX = (groundOffsetX + PIPE_SPEED) % 24;

  const gy = H - GROUND_H;

  // Ground body
  const groundGrad = ctx.createLinearGradient(0, gy, 0, H);
  groundGrad.addColorStop(0, GROUND_TOP);
  groundGrad.addColorStop(0.15, '#7cb342');
  groundGrad.addColorStop(0.2, '#c8a96e');
  groundGrad.addColorStop(1, '#a0845e');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, gy, W, GROUND_H);

  // Ground stripe pattern
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = -1; i < W / 24 + 2; i++) {
    const sx = i * 24 - groundOffsetX;
    ctx.fillRect(sx, gy + 14, 12, GROUND_H - 14);
  }

  // Grass top edge
  ctx.fillStyle = '#9ccc65';
  ctx.fillRect(0, gy, W, 4);

  // Grass tufts
  ctx.fillStyle = '#7cb342';
  for (let i = -1; i < W / 12 + 2; i++) {
    const tx = i * 12 - groundOffsetX * 0.5;
    ctx.beginPath();
    ctx.moveTo(tx, gy + 4);
    ctx.lineTo(tx + 4, gy - 3);
    ctx.lineTo(tx + 8, gy + 4);
    ctx.fill();
  }
}

// ── Particles ──
let particles = [];

function spawnScoreParticle() {
  for (let i = 0; i < 14; i++) {
    particles.push({
      x: bird.x + 10,
      y: bird.y - 20,
      vx: (Math.random() - 0.5) * 6,
      vy: -2 - Math.random() * 5,
      alpha: 1,
      size: 3 + Math.random() * 6,
      color: ['#ffe082', '#ffcc02', '#fff176', '#ffee58', '#ffffff'][Math.floor(Math.random() * 5)]
    });
  }
}

function spawnDeathParticles() {
  for (let i = 0; i < 24; i++) {
    particles.push({
      x: bird.x,
      y: bird.y,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 0.5) * 9,
      alpha: 1,
      size: 3 + Math.random() * 6,
      color: ['#ffe135', '#f5a623', '#e74c3c', '#fff', '#ffd166'][Math.floor(Math.random() * 5)]
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.135 * currentDifficulty * currentDifficulty;
    p.alpha -= 0.023 * currentDifficulty;
    p.size *= 0.97;
    return p.alpha > 0;
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── Collision ──
function checkCollision() {
  const b = bird.getBounds();
  const groundY = H - GROUND_H;

  // Ground / ceiling
  if (b.y + b.h > groundY || b.y < 0) return true;

  // Pipes
  for (const pipe of pipes) {
    const botY = pipe.topH + PIPE_GAP;
    const capW = 8;

    // Top pipe body
    if (rectsOverlap(b, { x: pipe.x, y: 0, w: PIPE_W, h: pipe.topH })) return true;
    // Top cap
    if (rectsOverlap(b, { x: pipe.x - capW/2, y: pipe.topH - 26, w: PIPE_W + capW, h: 26 })) return true;
    // Bottom pipe body
    if (rectsOverlap(b, { x: pipe.x, y: botY, w: PIPE_W, h: H - GROUND_H - botY })) return true;
    // Bottom cap
    if (rectsOverlap(b, { x: pipe.x - capW/2, y: botY, w: PIPE_W + capW, h: 26 })) return true;
  }
  return false;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ── Game Actions ──
let shakeAmount = 0;

// ── Game Actions ──
function startGame() {
  state = STATES.PLAYING;
  score = 0;
  pipes = [];
  particles = [];
  bird.reset();
  frameCount = 0;
  shakeAmount = 0;

  startScreen.classList.remove('active');
  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  scoreDisplay.style.display = 'block';
  scoreDisplay.textContent = '0';

  spawnPipe();
}

function updateBestScoreUI() {
  const val = Number(bestScore) || 0;
  bestScoreEl.textContent = `Best: ${val}`;
  if (startBestScoreEl) startBestScoreEl.textContent = String(val);
}

function gameOver() {
  state = STATES.DEAD;
  shakeAmount = 12;
  triggerFlash('#ff5f57', 0.9);
  spawnDeathParticles();

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(`flappyBest_${currentDifficulty}`, bestScore);
    if (currentDifficulty === 1.0) localStorage.setItem('flappyBest', bestScore); // Legacy compat
    updateBestScoreUI();
  }

  setTimeout(() => {
    scoreDisplay.style.display = 'none';
    gameOverScreen.style.display = 'flex';
    gameOverScreen.classList.add('active');
    finalScoreEl.textContent = `Score: ${score}`;
    bestScoreEl.textContent = `Best: ${bestScore}`;

    // Medal
    if (score >= 40) medalEl.textContent = '🏆';
    else if (score >= 20) medalEl.textContent = '🥇';
    else if (score >= 10) medalEl.textContent = '🥈';
    else if (score >= 5) medalEl.textContent = '🥉';
    else medalEl.textContent = '';
  }, 600);
}

function handleFlap() {
  if (state === STATES.MENU) {
    startGame();
    bird.flap();
  } else if (state === STATES.PLAYING) {
    bird.flap();
  } else if (state === STATES.DEAD) {
    // Allow restart after a short delay
  }
}

// ── Input ──
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (state === STATES.DEAD && gameOverScreen.style.display !== 'none') {
      startGame();
      bird.flap();
    } else {
      handleFlap();
    }
  }
});

canvas.addEventListener('click', () => {
  if (state === STATES.PLAYING) handleFlap();
});
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (state === STATES.PLAYING) handleFlap();
});

startBtn.addEventListener('click', () => { startGame(); bird.flap(); });
restartBtn.addEventListener('click', () => { startGame(); bird.flap(); });
menuBtn.addEventListener('click', () => {
  score = 0;
  pipes = [];
  particles = [];
  bird.reset();
  frameCount = 0;
  shakeAmount = 0;
  showMainMenu();
});

shopBtn.addEventListener('click', () => {
  state = STATES.MENU;
  startScreen.classList.remove('active');
  startScreen.style.display = 'none';
  shopScreen.style.display = 'flex';
  shopScreen.classList.add('active');
  updateShopUI();
});

closeShopBtn.addEventListener('click', () => {
  shopScreen.style.display = 'none';
  shopScreen.classList.remove('active');
  startScreen.classList.add('active');
  startScreen.style.display = 'flex';
  updateShopUI();
});

document.querySelectorAll('.shop-buy').forEach(button => {
  button.addEventListener('click', () => buySkin(button.dataset.skin));
});

loadShopState();
showMainMenu();
applyShopUpgrades();
// Инициализация при загрузке
setDifficulty(1.0); 
updateBestScoreUI();
updateShopUI();

// ── Logic Loop (Fixed Timestep) ──
let menuBobTime = 0;

function updateLogic() {
  frameCount++;
  dayCycleTime += 0.0002 * currentDifficulty; 

  // Screen shake offset
  let shakeX = 0, shakeY = 0;
  if (shakeAmount > 0) {
    shakeX = (Math.random() - 0.5) * shakeAmount;
    shakeY = (Math.random() - 0.5) * shakeAmount;
    shakeAmount *= 0.85;
    if (shakeAmount < 0.5) shakeAmount = 0;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground();

  if (state === STATES.MENU) {
    menuBobTime += 0.047 * currentDifficulty; 
    bird.y = H / 2 + Math.sin(menuBobTime) * 15;
    bird.flapFrame = Math.sin(menuBobTime * 3) > 0 ? 6 : 0;
    bird.rotation = 0;
    bird.draw();
  }

  if (state === STATES.PLAYING) {
    // Update bird
    bird.update();

    // Update pipes
    pipes.forEach(p => {
      p.x -= PIPE_SPEED;
      if (p.coin && !p.coin.collected) p.coin.x -= PIPE_SPEED;
    });
    pipes = pipes.filter(p => p.x + PIPE_W > -20);

    // Spawn pipes
    const lastPipe = pipes[pipes.length - 1];
    if (!lastPipe || lastPipe.x < W - PIPE_SPACING) {
      spawnPipe();
    }

    // Score and coin collection
    pipes.forEach(p => {
      if (!p.scored && p.x + PIPE_W < bird.x) {
        p.scored = true;
        score++;
        scoreDisplay.textContent = score;
        scoreDisplay.classList.add('pop');
        setTimeout(() => scoreDisplay.classList.remove('pop'), 100);
        triggerFlash('#fff2a8', 0.5);
        spawnScoreParticle();
      }

      if (p.coin && !p.coin.collected) {
        const coinX = p.x + PIPE_W / 2;
        const dx = Math.abs(bird.x - coinX);
        const dy = Math.abs(bird.y - p.coin.y);
        if (dx < bird.w * 0.45 + p.coin.r && dy < bird.h * 0.45 + p.coin.r) {
          p.coin.collected = true;
          const coinValue = p.coin.type === 'diamond' ? 5 : p.coin.type === 'silver' ? 2 : 1;
          totalCoins += coinValue;
          saveCoins();
          triggerFlash('#ffd166', 0.65);
          for (let i = 0; i < 10; i++) {
            particles.push({
              x: p.coin.x,
              y: p.coin.y,
              vx: (Math.random() - 0.5) * 5,
              vy: -1 - Math.random() * 4,
              alpha: 1,
              size: 2 + Math.random() * 4,
              color: p.coin.type === 'diamond' ? '#7ef9ff' : p.coin.type === 'silver' ? '#dfe8f7' : '#ffd84d'
            });
          }
        }
      }
    });

    // Draw pipes
    pipes.forEach(drawPipe);

    // Draw coins
    pipes.forEach(p => {
      if (p.coin && !p.coin.collected) {
        const bob = Math.sin((frameCount + p.coin.x) * 0.12 + p.coin.phase) * 3;
        const colors = {
          gold: { main: '#ffd54a', inner: '#fff1a8', outline: 'rgba(124, 92, 0, 0.7)' },
          silver: { main: '#dfe8f7', inner: '#ffffff', outline: 'rgba(85, 104, 130, 0.7)' },
          diamond: { main: '#73e7ff', inner: '#effcff', outline: 'rgba(24, 90, 128, 0.7)' }
        };
        const color = colors[p.coin.type] || colors.gold;

        ctx.beginPath();
        ctx.fillStyle = color.main;
        ctx.arc(p.coin.x, p.coin.y + bob, p.coin.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = color.inner;
        ctx.arc(p.coin.x - p.coin.r * 0.28, p.coin.y - p.coin.r * 0.2 + bob, p.coin.r * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = color.outline;
        ctx.lineWidth = 2;
        ctx.arc(p.coin.x, p.coin.y + bob, p.coin.r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.arc(p.coin.x + p.coin.r * 0.15, p.coin.y - p.coin.r * 0.15 + bob, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw bird
    bird.draw();

    // Particles
    updateParticles();
    drawParticles();

    // Collision
    if (checkCollision()) {
      gameOver();
    }
  }

  if (state === STATES.DEAD) {
    // Still draw pipes
    pipes.forEach(drawPipe);
    pipes.forEach(p => drawCoin(p.coin));

    // Bird falls
    bird.vy += bird.gravity;
    bird.y += bird.vy;
    bird.rotation = 90;
    if (bird.y > H - GROUND_H - bird.h / 2) {
      bird.y = H - GROUND_H - bird.h / 2;
      bird.vy = 0;
    }
    updateParticles();
  }
}

// ── Main Loop ──
let lastTime = performance.now();
let accumulator = 0;
const TIME_STEP = 1000 / 60;

function gameLoop(timestamp) {
  let deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  if (deltaTime > 250) deltaTime = 250;
  accumulator += deltaTime;

  while (accumulator >= TIME_STEP) {
    updateLogic();
    accumulator -= TIME_STEP;
  }

  // Отрисовка
  ctx.clearRect(0, 0, W, H);
  
  let shakeX = 0, shakeY = 0;
  if (shakeAmount > 0) {
    shakeX = (Math.random() - 0.5) * shakeAmount;
    shakeY = (Math.random() - 0.5) * shakeAmount;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground();
  
  if (state === STATES.MENU || state === STATES.PLAYING) {
    pipes.forEach(drawPipe);
    bird.draw();
    if (state === STATES.PLAYING) drawParticles();
  }

  if (state === STATES.DEAD) {
    pipes.forEach(drawPipe);
    bird.draw();
    drawParticles();
  }

  drawGround();
  drawCoinHud();

  let phase = (dayCycleTime % 1.0) * 3;
  let index = Math.floor(phase);
  let t = phase - index;
  let blend = t > 0.5 ? (t - 0.5) * 2 : 0;
  
  let darkness = 0;
  if (index === 1) darkness = blend * 0.45; 
  else if (index === 2) darkness = 0.45 - (blend * 0.45); 
  
  if (darkness > 0) {
    ctx.fillStyle = `rgba(11, 29, 58, ${darkness})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (flashAlpha > 0) {
    ctx.fillStyle = flashColor;
    ctx.globalAlpha = flashAlpha;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1.0;
    
    flashAlpha -= 0.05; 
    if (flashAlpha < 0) flashAlpha = 0;
  }

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

// Запускаем игру
requestAnimationFrame(gameLoop);