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

// ── Game State ──
const STATES = { MENU: 0, PLAYING: 1, DEAD: 2 };
let state = STATES.MENU;
let score = 0;
let bestScore = parseInt(localStorage.getItem('flappyBest') || '0');
let frameCount = 0;

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
  gravity: 0.45,
  flapPower: -7.5,
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

    // Rotation
    const targetRot = Math.min(this.vy * 4, 90);
    this.rotation += (targetRot - this.rotation) * 0.12;

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
      p.alpha -= 0.03;
      p.x -= 1.5;
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

    // Body
    const bodyGrad = ctx.createLinearGradient(0, -this.h/2, 0, this.h/2);
    bodyGrad.addColorStop(0, '#ffe135');
    bodyGrad.addColorStop(1, '#f5a623');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    const wingY = this.flapFrame > 4 ? -8 : this.flapFrame > 0 ? -3 : 2;
    ctx.fillStyle = '#f0c040';
    ctx.beginPath();
    ctx.ellipse(-6, wingY, 12, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();

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
const PIPE_SPEED = 2.5;
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
    speed: 0.2 + Math.random() * 0.4,
    alpha: 0.3 + Math.random() * 0.4
  });
}

function drawBackground() {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
  skyGrad.addColorStop(0, SKY_TOP);
  skyGrad.addColorStop(1, SKY_BOT);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H - GROUND_H);

  // Clouds
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
  for (let i = 0; i < 6; i++) {
    particles.push({
      x: bird.x + 10,
      y: bird.y - 20,
      vx: (Math.random() - 0.5) * 4,
      vy: -2 - Math.random() * 3,
      alpha: 1,
      size: 3 + Math.random() * 4,
      color: ['#ffe082', '#ffcc02', '#fff176', '#ffee58'][Math.floor(Math.random() * 4)]
    });
  }
}

function spawnDeathParticles() {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: bird.x,
      y: bird.y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      alpha: 1,
      size: 3 + Math.random() * 5,
      color: ['#ffe135', '#f5a623', '#e74c3c', '#fff'][Math.floor(Math.random() * 4)]
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.alpha -= 0.02;
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

// ── Screen Shake ──
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

function gameOver() {
  state = STATES.DEAD;
  shakeAmount = 12;
  spawnDeathParticles();

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('flappyBest', bestScore);
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

// ── Menu Animation ──
let menuBobTime = 0;

// ── Main Loop ──
function gameLoop() {
  frameCount++;
  ctx.clearRect(0, 0, W, H);

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
    // Bob the bird on menu
    menuBobTime += 0.04;
    bird.y = H / 2 + Math.sin(menuBobTime) * 15;
    bird.flapFrame = Math.sin(menuBobTime * 3) > 0 ? 6 : 0;
    bird.rotation = 0;
    bird.draw();
  }

  if (state === STATES.PLAYING) {
    // Update bird
    bird.update();

    // Update pipes
    pipes.forEach(p => p.x -= PIPE_SPEED);
    pipes = pipes.filter(p => p.x + PIPE_W > -20);

    // Spawn pipes
    const lastPipe = pipes[pipes.length - 1];
    if (!lastPipe || lastPipe.x < W - PIPE_SPACING) {
      spawnPipe();
    }

    // Score
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

    // Draw pipes
    pipes.forEach(drawPipe);

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

    // Bird falls
    bird.vy += bird.gravity;
    bird.y += bird.vy;
    bird.rotation = 90;
    if (bird.y > H - GROUND_H - bird.h / 2) {
      bird.y = H - GROUND_H - bird.h / 2;
      bird.vy = 0;
    }
    bird.draw();

    updateParticles();
    drawParticles();
  }

  drawGround();

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

gameLoop();
