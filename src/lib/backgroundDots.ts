function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDotHoverProgress() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--dot-hover-progress').trim();
  const value = parseFloat(raw);
  return Number.isFinite(value) ? clamp(value, 0, 1) : 0;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  anchorX: number;
  anchorY: number;
  anchorVx: number;
  anchorVy: number;
  size: number;
  color: string;
  maxAlpha: number;
  age: number;
  lifespan: number;
  phase: number;
}

const COLORS = ['#982598', '#e491c9', '#f1e9e9'];
const COLORS_THOUGHT = ['#15173d', '#1c1f4a', '#982598'];

function getColors() {
  return document.body.classList.contains('thought-open') ? COLORS_THOUGHT : COLORS;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let rafId = 0;
let width = 0;
let height = 0;
let mouseX = -1000;
let mouseY = -1000;
let running = false;
let time = 0;

function particleCount() {
  const area = window.innerWidth * window.innerHeight;
  const thoughtOpen = document.body.classList.contains('thought-open');

  if (thoughtOpen) {
    return Math.min(220, Math.max(110, Math.floor(area / 9000)));
  }

  return Math.min(160, Math.max(70, Math.floor(area / 12000)));
}

function spawnParticle(awayFromCursor = false): Particle {
  let anchorX = Math.random() * width;
  let anchorY = Math.random() * height;

  if (awayFromCursor && mouseX > 0) {
    let attempts = 0;
    while (attempts < 8) {
      const dist = Math.hypot(anchorX - mouseX, anchorY - mouseY);
      if (dist > 180) break;
      anchorX = Math.random() * width;
      anchorY = Math.random() * height;
      attempts++;
    }
  }

  const palette = getColors();

  return {
    x: anchorX,
    y: anchorY,
    vx: 0,
    vy: 0,
    anchorX,
    anchorY,
    anchorVx: (Math.random() - 0.5) * 0.06,
    anchorVy: (Math.random() - 0.5) * 0.06,
    size: 0.5 + Math.random() * 1,
    color: palette[Math.floor(Math.random() * palette.length)],
    maxAlpha: 0.2 + Math.random() * 0.5,
    age: 0,
    lifespan: 280 + Math.random() * 360,
    phase: Math.random() * Math.PI * 2,
  };
}

function createParticles() {
  particles = Array.from({ length: particleCount() }, () => spawnParticle());
}

function lifeAlpha(p: Particle) {
  const t = p.age / p.lifespan;
  if (t < 0.2) return t / 0.2;
  if (t > 0.7) return Math.max(0, (1 - t) / 0.3);
  return 1;
}

function bounceAnchor(p: Particle) {
  if (p.anchorX < 40 || p.anchorX > width - 40) p.anchorVx *= -1;
  if (p.anchorY < 40 || p.anchorY > height - 40) p.anchorVy *= -1;
  p.anchorX = Math.max(20, Math.min(width - 20, p.anchorX));
  p.anchorY = Math.max(20, Math.min(height - 20, p.anchorY));
}

function resize() {
  if (!canvas || !ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (particles.length === 0) createParticles();
}

function draw() {
  if (!ctx) return;

  time += 0.016;
  ctx.clearRect(0, 0, width, height);

  const cursorRadius = 120;
  const targetCount = particleCount();
  const introDim = document.body.classList.contains('thought-open') ? 0 : getDotHoverProgress();
  const particleBoost = 1 + introDim * 1.65;
  const sizeBoost = 1 + introDim * 0.55;

  while (particles.length < targetCount) {
    particles.push(spawnParticle(true));
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.age += 1;

    if (p.age >= p.lifespan) {
      particles[i] = spawnParticle(true);
      continue;
    }

    p.anchorX += p.anchorVx;
    p.anchorY += p.anchorVy;
    bounceAnchor(p);

    const floatX = Math.sin(time * 0.9 + p.phase) * 14;
    const floatY = Math.cos(time * 0.7 + p.phase * 1.4) * 12;
    const targetX = p.anchorX + floatX;
    const targetY = p.anchorY + floatY;

    p.vx += (targetX - p.x) * 0.022;
    p.vy += (targetY - p.y) * 0.022;

    const dx = p.x - mouseX;
    const dy = p.y - mouseY;
    const dist = Math.hypot(dx, dy);

    if (dist < cursorRadius && dist > 0) {
      const force = (1 - dist / cursorRadius) * 2.2;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
    }

    p.vx *= 0.9;
    p.vy *= 0.9;
    p.x += p.vx;
    p.y += p.vy;

    const nearCursor = dist < cursorRadius;
    const alpha = p.maxAlpha * lifeAlpha(p) * (nearCursor ? 1.25 : 1) * particleBoost;
    const size = p.size * (nearCursor ? 1.3 : 1) * sizeBoost;

    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  if (mouseX > 0 && mouseY > 0) {
    const glowStrength = 0.07 + introDim * 0.14;
    const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, cursorRadius);
    gradient.addColorStop(0, `rgba(228, 145, 201, ${glowStrength})`);
    gradient.addColorStop(0.45, `rgba(152, 37, 152, ${glowStrength * 0.65})`);
    gradient.addColorStop(1, 'rgba(152, 37, 152, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(mouseX - cursorRadius, mouseY - cursorRadius, cursorRadius * 2, cursorRadius * 2);
  }

  rafId = requestAnimationFrame(draw);
}

function onMouseMove(e: MouseEvent) {
  mouseX = e.clientX;
  mouseY = e.clientY;
}

function onVisibilityChange() {
  if (document.hidden) {
    cancelAnimationFrame(rafId);
    running = false;
  } else if (!running) {
    running = true;
    draw();
  }
}

function onThoughtThemeChange() {
  // createParticles() re-rolls every colour from the active palette.
  createParticles();
}

let initialized = false;
let resizeTimer = 0;

export function initBackgroundDots() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  canvas = document.getElementById('bg-dots-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  if (reducedMotion) {
    canvas.style.display = 'none';
    return;
  }

  ctx = canvas.getContext('2d');
  if (!ctx) return;

  resize();
  if (particles.length === 0) createParticles();

  if (!initialized) {
    initialized = true;
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        createParticles();
      }, 200);
    });
    document.addEventListener('visibilitychange', onVisibilityChange);

    const themeObserver = new MutationObserver(() => onThoughtThemeChange());
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  if (!running) {
    running = true;
    cancelAnimationFrame(rafId);
    draw();
  }

  if (!finePointer) {
    mouseX = width / 2;
    mouseY = height / 2;
  }
}

export function destroyBackgroundDots() {
  cancelAnimationFrame(rafId);
  running = false;
  particles = [];
}
