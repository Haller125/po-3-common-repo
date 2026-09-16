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

// ── Game State ──
const STATES = { MENU: 0, PLAYING: 1, DEAD: 2 };
let state = STATES.MENU;
let score = 0;
let bestScore = 0;
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

    const bodyGrad = ctx.createLinearGradient(0, -this.h/2, 0, this.h/2);
    bodyGrad.addColorStop(0, '#ffe135');
    bodyGrad.addColorStop(1, '#f5a623');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    const wingY = this.flapFrame > 4 ? -8 : this.flapFrame > 0 ? -3 : 2;
    ctx.fillStyle = '#f0c040';
    ctx.beginPath();
    ctx.ellipse(-6, wingY, 12, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(10, -5, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(12, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(13.5, -6, 1.5, 0, Math.PI * 2);
    ctx.fill();

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

function spawnPipe() {
  const minY = 80;
  const maxY = H - GROUND_H - PIPE_GAP - 80;
  const topH = minY + Math.random() * (maxY - minY);
  pipes.push({
    x: W + 20,
    topH: topH,
    scored: false
  });
}

function drawPipe(pipe) {
  const topH = pipe.topH;
  const botY = topH + PIPE_GAP;
  const botH = H - GROUND_H - botY;
  const capW = 8;
  const capH = 26;

  const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
  topGrad.addColorStop(0, '#3a9e3e');
  topGrad.addColorStop(0.3, '#5ec862');
  topGrad.addColorStop(0.7, '#4db851');
  topGrad.addColorStop(1, '#2d7e31');
  ctx.fillStyle = topGrad;
  ctx.fillRect(pipe.x, 0, PIPE_W, topH);

  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.roundRect(pipe.x - capW/2, topH - capH, PIPE_W + capW, capH, [0, 0, 6, 6]);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(pipe.x + 6, 0, 8, topH - capH);

  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(pipe.x + PIPE_W - 10, 0, 6, topH - capH);

  const botGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
  botGrad.addColorStop(0, '#3a9e3e');
  botGrad.addColorStop(0.3, '#5ec862');
  botGrad.addColorStop(0.7, '#4db851');
  botGrad.addColorStop(1, '#2d7e31');
  ctx.fillStyle = botGrad;
  ctx.fillRect(pipe.x, botY, PIPE_W, botH);

  ctx.beginPath();
  ctx.roundRect(pipe.x - capW/2, botY, PIPE_W + capW, capH, [6, 6, 0, 0]);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(pipe.x + 6, botY + capH, 8, botH - capH);

  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(pipe.x + PIPE_W - 10, botY + capH, 6, botH - capH);
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
  const gy = H - GROUND_H;
  const groundGrad = ctx.createLinearGradient(0, gy, 0, H);
  groundGrad.addColorStop(0, GROUND_TOP);
  groundGrad.addColorStop(0.15, '#7cb342');
  groundGrad.addColorStop(0.2, '#c8a96e');
  groundGrad.addColorStop(1, '#a0845e');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, gy, W, GROUND_H);

  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = -1; i < W / 24 + 2; i++) {
    const sx = i * 24 - groundOffsetX;
    ctx.fillRect(sx, gy + 14, 12, GROUND_H - 14);
  }

  ctx.fillStyle = '#9ccc65';
  ctx.fillRect(0, gy, W, 4);

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

  if (b.y + b.h > groundY || b.y < 0) return true;

  for (const pipe of pipes) {
    const botY = pipe.topH + PIPE_GAP;
    const capW = 8;

    if (rectsOverlap(b, { x: pipe.x, y: 0, w: PIPE_W, h: pipe.topH })) return true;
    if (rectsOverlap(b, { x: pipe.x - capW/2, y: pipe.topH - 26, w: PIPE_W + capW, h: 26 })) return true;
    if (rectsOverlap(b, { x: pipe.x, y: botY, w: PIPE_W, h: H - GROUND_H - botY })) return true;
    if (rectsOverlap(b, { x: pipe.x - capW/2, y: botY, w: PIPE_W + capW, h: 26 })) return true;
  }
  return false;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ── Game Actions ──
let shakeAmount = 0;

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
  state = STATES.MENU;
  score = 0;
  pipes = [];
  particles = [];
  bird.reset();
  frameCount = 0;
  shakeAmount = 0;

  startScreen.classList.add('active');
  startScreen.style.display = 'flex';
  gameOverScreen.style.display = 'none';
  gameOverScreen.classList.remove('active');
  scoreDisplay.style.display = 'none';
  updateBestScoreUI();
});

// Инициализация при загрузке
setDifficulty(1.0); 
updateBestScoreUI();

// ── Logic Loop (Fixed Timestep) ──
let menuBobTime = 0; 

function updateLogic() {
  frameCount++;
  dayCycleTime += 0.0002 * currentDifficulty; 
  
  if (shakeAmount > 0) {
    shakeAmount *= 0.85;
    if (shakeAmount < 0.5) shakeAmount = 0;
  }

  updateEnvironment();

  if (state === STATES.MENU) {
    menuBobTime += 0.047 * currentDifficulty; 
    bird.y = H / 2 + Math.sin(menuBobTime) * 15;
    bird.flapFrame = Math.sin(menuBobTime * 3) > 0 ? 6 : 0;
    bird.rotation = 0;
  }

  if (state === STATES.PLAYING) {
    bird.update();

    pipes.forEach(p => p.x -= PIPE_SPEED);
    pipes = pipes.filter(p => p.x + PIPE_W > -20);

    const lastPipe = pipes[pipes.length - 1];
    if (!lastPipe || lastPipe.x < W - PIPE_SPACING) {
      spawnPipe();
    }

    pipes.forEach(p => {
      if (!p.scored && p.x + PIPE_W < bird.x) {
        p.scored = true;
        score++;
        scoreDisplay.textContent = score;
        scoreDisplay.classList.add('pop');
        setTimeout(() => scoreDisplay.classList.remove('pop'), 100);
        spawnScoreParticle();
      }
    });

    updateParticles();

    if (checkCollision()) {
      gameOver();
    }
  }

  if (state === STATES.DEAD) {
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