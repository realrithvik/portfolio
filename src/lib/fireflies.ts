const STORAGE_KEY = 'portfolio-firefly-count';
const MAX_ACTIVE = 4;
const SPAWN_MIN_MS = 3000;
const SPAWN_MAX_MS = 9000;
const LIFESPAN_MS = 25000;
const FLY_DURATION_MS = 900;
const MAX_VISIBLE_DOTS = 24;
/** Matches the jarCollectPulse animation duration in global.css. */
const JAR_PULSE_MS = 500;
/** Fireflies and the jar belong to the landing screen only. */
const LANDING_SCROLL_MAX = 100;
/** Half the drawn hoop in .glow-cursor__net — keep the two in step. */
const CATCH_RADIUS = 32;
/** How long a skill phrase stays up. Matches the fireflyPhrase animation. */
const PHRASE_MS = 1500;
const MAX_PHRASES = 3;

const YELLOWS = ['#e8c96b', '#f5dc9a', '#ddb85a'];

interface ActiveFirefly {
  el: HTMLButtonElement;
  lifespanTimer: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  pauseUntil: number;
  collecting: boolean;
  /** The net is open over this one, so it holds still. */
  settled: boolean;
}

let field: HTMLElement | null = null;
let active: ActiveFirefly[] = [];
let spawnTimer = 0;
let motionRaf = 0;
let motionLoopActive = false;
let initialized = false;
let reducedMotion = false;
let jarPulseTimer = 0;
let ambientSuspended = false;
let pointerInit = false;
let pointerX = -9999;
let pointerY = -9999;
let netTarget: ActiveFirefly | null = null;
let phrases: HTMLElement[] = [];
let phraseDeck: string[] = [];
let phraseIndex = 0;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function getFireflyCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = parseInt(raw ?? '0', 10);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  } catch {
    return 0;
  }
}

export function setFireflyCount(count: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.max(0, count)));
  } catch {
    /* ignore */
  }
  updateFireflyJar(count);
}

export function updateFireflyJar(count: number) {
  const jar = document.getElementById('firefly-jar');
  const dotsContainer = document.getElementById('firefly-jar-dots');
  const badge = document.getElementById('firefly-jar-badge');
  if (!jar || !dotsContainer) return;

  jar.setAttribute(
    'aria-label',
    count > 0
      ? `${count} fireflies collected. Click to release them.`
      : '0 fireflies collected',
  );
  jar.classList.toggle('has-fireflies', count > 0);
  jar.toggleAttribute('disabled', count === 0);

  dotsContainer.replaceChildren();

  const visible = Math.min(count, MAX_VISIBLE_DOTS);
  for (let i = 0; i < visible; i++) {
    const dot = document.createElement('span');
    dot.className = 'firefly-jar__dot';
    dot.setAttribute('aria-hidden', 'true');
    const x = 14 + ((i * 17 + (i % 3) * 11) % 58);
    const y = 18 + ((i * 13 + (i % 5) * 9) % 62);
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    dot.style.setProperty('--dot-hue', YELLOWS[i % YELLOWS.length]);
    dotsContainer.appendChild(dot);
  }

  if (badge) {
    if (count > MAX_VISIBLE_DOTS) {
      badge.textContent = String(count);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }
}

function viewportPadding() {
  return {
    x: window.innerWidth * 0.1,
    y: window.innerHeight * 0.1,
  };
}

function onLandingScreen() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return (
    path === '/' &&
    window.scrollY < LANDING_SCROLL_MAX &&
    !document.body.classList.contains('thought-open')
  );
}

function canSpawn() {
  if (!field || ambientSuspended || !onLandingScreen()) return false;
  if (active.length >= MAX_ACTIVE) return false;
  return true;
}

function isInHeroIntro(x: number, y: number) {
  const intro = document.querySelector<HTMLElement>('.hero__intro');
  if (!intro) return false;
  const rect = intro.getBoundingClientRect();
  const pad = 48;
  return (
    x >= rect.left - pad &&
    x <= rect.right + pad &&
    y >= rect.top - pad &&
    y <= rect.bottom + pad
  );
}

function randomPosition(): { x: number; y: number } {
  const pad = viewportPadding();
  let attempts = 0;

  while (attempts < 12) {
    const x = randomBetween(pad.x, window.innerWidth - pad.x);
    const y = randomBetween(pad.y, window.innerHeight - pad.y);
    if (!isInHeroIntro(x, y)) return { x, y };
    attempts++;
  }

  return {
    x: randomBetween(pad.x, window.innerWidth - pad.x),
    y: randomBetween(pad.y, window.innerHeight - pad.y),
  };
}

function pickWanderTarget(x: number, y: number) {
  const pad = viewportPadding();
  const wanderRadius = randomBetween(45, 130);
  const angle = randomBetween(0, Math.PI * 2);
  let tx = x + Math.cos(angle) * wanderRadius;
  let ty = y + Math.sin(angle) * wanderRadius;

  tx = clamp(tx, pad.x, window.innerWidth - pad.x);
  ty = clamp(ty, pad.y, window.innerHeight - pad.y);

  if (isInHeroIntro(tx, ty)) {
    const intro = document.querySelector<HTMLElement>('.hero__intro');
    if (intro) {
      const rect = intro.getBoundingClientRect();
      const icx = rect.left + rect.width / 2;
      const icy = rect.top + rect.height / 2;
      tx = clamp(x + (x - icx) * 0.45, pad.x, window.innerWidth - pad.x);
      ty = clamp(y + (y - icy) * 0.45, pad.y, window.innerHeight - pad.y);
    }
  }

  return { x: tx, y: ty };
}

function updateFireflyMotion(entry: ActiveFirefly, now: number) {
  if (entry.collecting) return;

  const pad = viewportPadding();
  const maxSpeed = 0.72;

  if (entry.settled) {
    // Drift to a stop rather than fleeing — the net opening is what stills it.
    entry.vx *= 0.82;
    entry.vy *= 0.82;
  } else if (now < entry.pauseUntil) {
    entry.vx *= 0.88;
    entry.vy *= 0.88;
  } else {
    const dx = entry.targetX - entry.x;
    const dy = entry.targetY - entry.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 8 || Math.random() < 0.004) {
      const target = pickWanderTarget(entry.x, entry.y);
      entry.targetX = target.x;
      entry.targetY = target.y;
      if (Math.random() < 0.3) {
        entry.pauseUntil = now + randomBetween(400, 2000);
      }
    }

    entry.vx += dx * 0.014 + randomBetween(-0.28, 0.28);
    entry.vy += dy * 0.014 + randomBetween(-0.28, 0.28);

    const speed = Math.hypot(entry.vx, entry.vy);
    if (speed > maxSpeed) {
      entry.vx = (entry.vx / speed) * maxSpeed;
      entry.vy = (entry.vy / speed) * maxSpeed;
    }
  }

  entry.x += entry.vx;
  entry.y += entry.vy;

  if (entry.x < pad.x) {
    entry.x = pad.x;
    entry.vx = Math.abs(entry.vx) * 0.4;
  } else if (entry.x > window.innerWidth - pad.x) {
    entry.x = window.innerWidth - pad.x;
    entry.vx = -Math.abs(entry.vx) * 0.4;
  }

  if (entry.y < pad.y) {
    entry.y = pad.y;
    entry.vy = Math.abs(entry.vy) * 0.4;
  } else if (entry.y > window.innerHeight - pad.y) {
    entry.y = window.innerHeight - pad.y;
    entry.vy = -Math.abs(entry.vy) * 0.4;
  }

  entry.el.style.left = `${entry.x}px`;
  entry.el.style.top = `${entry.y}px`;
}

function nearestFirefly(x: number, y: number) {
  let best: ActiveFirefly | null = null;
  let bestDist = CATCH_RADIUS;

  for (const entry of active) {
    if (entry.collecting) continue;
    const dist = Math.hypot(entry.x - x, entry.y - y);
    if (dist <= bestDist) {
      bestDist = dist;
      best = entry;
    }
  }

  return best;
}

function clearNetTarget() {
  if (netTarget) {
    netTarget.settled = false;
    netTarget.el.classList.remove('is-settled');
    netTarget = null;
  }
  document.getElementById('glow-cursor')?.classList.remove('is-catching');
}

/**
 * Opens the net when the pointer is within CATCH_RADIUS of a firefly. Runs from both
 * the pointer handler and the motion loop: the pointer can move to a firefly, but a
 * firefly can also drift to a stationary pointer — and under reduced motion the
 * loop never runs at all.
 */
function updateNetTarget() {
  const nearest = nearestFirefly(pointerX, pointerY);

  if (nearest !== netTarget) {
    if (netTarget) {
      netTarget.settled = false;
      netTarget.el.classList.remove('is-settled');
    }
    netTarget = nearest;
    if (netTarget) {
      netTarget.settled = true;
      netTarget.el.classList.add('is-settled');
    }
  }

  document
    .getElementById('glow-cursor')
    ?.classList.toggle('is-catching', Boolean(netTarget));
}

function onDocumentClick(event: MouseEvent) {
  if (!netTarget) return;

  // Anything interactive — including the firefly's own button — handles its own
  // click. This only exists to catch the empty space inside the hoop.
  const target = event.target as HTMLElement | null;
  if (target?.closest('a, button, .btn, input, textarea')) return;

  const entry = nearestFirefly(event.clientX, event.clientY);
  if (!entry) return;

  event.preventDefault();
  collectFirefly(entry.el);
}

function initPointerNet() {
  if (pointerInit) return;
  pointerInit = true;

  document.addEventListener(
    'mousemove',
    (event) => {
      // Measured from the true pointer, not .glow-cursor — that element lerps
      // behind the mouse, and catching would inherit the lag.
      pointerX = event.clientX;
      pointerY = event.clientY;
      updateNetTarget();
    },
    { passive: true },
  );

  document.addEventListener('click', onDocumentClick);
}

function startMotionLoop() {
  if (motionLoopActive || reducedMotion) return;
  motionLoopActive = true;

  const loop = () => {
    const now = performance.now();
    active.forEach((entry) => updateFireflyMotion(entry, now));
    updateNetTarget();

    if (active.length > 0 && !document.body.classList.contains('thought-open')) {
      motionRaf = requestAnimationFrame(loop);
    } else {
      motionLoopActive = false;
    }
  };

  motionRaf = requestAnimationFrame(loop);
}

function stopMotionLoop() {
  cancelAnimationFrame(motionRaf);
  motionLoopActive = false;
}

function removeFirefly(entry: ActiveFirefly) {
  window.clearTimeout(entry.lifespanTimer);
  entry.el.remove();
  active = active.filter((f) => f !== entry);
  if (entry === netTarget) clearNetTarget();
  if (active.length === 0) stopMotionLoop();
}

function scheduleSpawn() {
  window.clearTimeout(spawnTimer);
  if (!field || reducedMotion) return;

  const delay = randomBetween(SPAWN_MIN_MS, SPAWN_MAX_MS);
  spawnTimer = window.setTimeout(() => {
    if (canSpawn()) spawnFirefly();
    scheduleSpawn();
  }, delay);
}

let jarScrollInit = false;
let jarScrollTicking = false;

function updateJarVisibility() {
  const jar = document.getElementById('firefly-jar');
  if (!jar) return;

  jar.classList.toggle('is-on-main-menu', onLandingScreen());
}

/**
 * Fireflies belong to the landing screen. Scrolling away (or opening the
 * thought overlay) fades the live ones out; coming back starts them again.
 */
function syncFireflyPresence() {
  const shouldRun = onLandingScreen();

  if (!shouldRun) {
    if (ambientSuspended) return;
    ambientSuspended = true;
    window.clearTimeout(spawnTimer);
    fadeOutActive();
    return;
  }

  if (!ambientSuspended) return;
  ambientSuspended = false;
  scheduleSpawn();

  // Don't make the user wait a full spawn interval for the field to return.
  window.setTimeout(() => {
    if (canSpawn()) spawnFirefly();
  }, 600);
}

let jarReleasing = false;

function createEscapeFirefly(color: string) {
  const el = document.createElement('span');
  el.className = 'firefly-escape';
  el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--firefly-color', color);

  const glow = document.createElement('span');
  glow.className = 'firefly-escape__glow';
  const core = document.createElement('span');
  core.className = 'firefly-escape__core';
  el.appendChild(glow);
  el.appendChild(core);

  return el;
}

function animateEscapeFirefly(
  el: HTMLElement,
  startX: number,
  startY: number,
  index: number,
  onDone: () => void,
) {
  // Staggered so they stream out of the jar rather than bursting all at once.
  const delay = index * 70;
  const duration = randomBetween(1000, 1400);
  const endX = startX + randomBetween(-120, 120);
  const endY = startY - randomBetween(160, 300);
  const cpX = startX + randomBetween(-50, 50);
  const cpY = startY - randomBetween(60, 130);

  el.style.left = `${startX}px`;
  el.style.top = `${startY}px`;
  el.style.transform = 'translate(-50%, -50%)';

  if (reducedMotion) {
    window.setTimeout(() => {
      el.remove();
      onDone();
    }, delay);
    return;
  }

  window.setTimeout(() => {
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = clamp((now - startTime) / duration, 0, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = quadBezier(startX, cpX, endX, eased);
      const y = quadBezier(startY, cpY, endY, eased);

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      // Hold full brightness through the first half, then fade — fading from the
      // start made the escape read as vanishing rather than flying away.
      el.style.opacity = String(t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5);
      el.style.transform = `translate(-50%, -50%) scale(${1 - eased * 0.45})`;

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        el.remove();
        onDone();
      }
    };

    requestAnimationFrame(tick);
  }, delay);
}

export function releaseJarFireflies() {
  const count = getFireflyCount();
  if (count === 0 || jarReleasing) return;

  const jar = document.getElementById('firefly-jar');
  const dotsContainer = document.getElementById('firefly-jar-dots');
  if (!jar || !dotsContainer) return;

  jarReleasing = true;
  jar.classList.add('is-releasing');
  jar.setAttribute('disabled', 'true');

  const { mouth } = getJarEntryPoints();
  const escapeCount = Math.min(count, MAX_VISIBLE_DOTS);
  let remaining = escapeCount;

  // Measure while the dots are still attached — a detached element reports a zero
  // rect, which would launch every firefly from the top-left corner of the screen.
  const origins = Array.from(
    dotsContainer.querySelectorAll<HTMLElement>('.firefly-jar__dot'),
  ).map((dot) => {
    const rect = dot.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });

  const onEscapeDone = () => {
    remaining -= 1;
    if (remaining <= 0) {
      setFireflyCount(0);
      jar.classList.remove('is-releasing');
      jarReleasing = false;
    }
  };

  dotsContainer.replaceChildren();
  const badge = document.getElementById('firefly-jar-badge');
  if (badge) badge.hidden = true;

  for (let i = 0; i < escapeCount; i++) {
    const origin = origins[i];
    const startX = origin ? origin.x : mouth.x + randomBetween(-16, 16);
    const startY = origin ? origin.y : mouth.y + randomBetween(-6, 10);

    const el = createEscapeFirefly(YELLOWS[i % YELLOWS.length]);
    // Body, not the firefly field: the field sits below the jar, so escapes would
    // be hidden behind the glass for the first stretch of the flight.
    document.body.appendChild(el);
    animateEscapeFirefly(el, startX, startY, i, onEscapeDone);
  }

  if (escapeCount === 0) {
    setFireflyCount(0);
    jar.classList.remove('is-releasing');
    jarReleasing = false;
  }
}

function initJarInteraction() {
  const jar = document.getElementById('firefly-jar');
  if (!jar || jar.dataset.releaseInit === 'true') return;
  jar.dataset.releaseInit = 'true';

  jar.addEventListener('click', () => {
    if (getFireflyCount() > 0) releaseJarFireflies();
  });
}

export function initFireflyJar() {
  initJarInteraction();
}

function initJarVisibility() {
  if (jarScrollInit) return;
  jarScrollInit = true;

  const onScroll = () => {
    if (jarScrollTicking) return;
    jarScrollTicking = true;
    requestAnimationFrame(() => {
      updateJarVisibility();
      syncFireflyPresence();
      jarScrollTicking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('astro:page-load', updateJarVisibility);
  initJarInteraction();
  updateJarVisibility();
}

function spawnFirefly() {
  if (!field || !canSpawn()) return;

  const pos = randomPosition();
  const wanderTarget = pickWanderTarget(pos.x, pos.y);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'firefly';
  btn.setAttribute('aria-label', 'Collect firefly');
  btn.style.left = `${pos.x}px`;
  btn.style.top = `${pos.y}px`;
  btn.style.setProperty('--firefly-color', YELLOWS[Math.floor(Math.random() * YELLOWS.length)]);
  btn.style.setProperty('--pulse-duration', `${randomBetween(1.6, 3.2)}s`);
  btn.style.setProperty('--pulse-delay', `${randomBetween(0, 1.5)}s`);

  const glow = document.createElement('span');
  glow.className = 'firefly__glow';
  glow.setAttribute('aria-hidden', 'true');
  const core = document.createElement('span');
  core.className = 'firefly__core';
  core.setAttribute('aria-hidden', 'true');
  btn.appendChild(glow);
  btn.appendChild(core);

  btn.addEventListener('click', (event) => {
    event.preventDefault();
    collectFirefly(btn);
  });

  field.appendChild(btn);

  const entry: ActiveFirefly = {
    el: btn,
    x: pos.x,
    y: pos.y,
    vx: randomBetween(-0.15, 0.15),
    vy: randomBetween(-0.15, 0.15),
    targetX: wanderTarget.x,
    targetY: wanderTarget.y,
    pauseUntil: performance.now() + randomBetween(200, 800),
    collecting: false,
    settled: false,
    lifespanTimer: window.setTimeout(() => {
      entry.el.classList.add('is-fading');
      window.setTimeout(() => removeFirefly(entry), 450);
    }, LIFESPAN_MS),
  };

  active.push(entry);
  startMotionLoop();
}

function getJarEntryPoints() {
  const jar = document.getElementById('firefly-jar');
  if (!jar) {
    return {
      mouth: { x: 48, y: window.innerHeight - 120 },
      interior: { x: 48, y: window.innerHeight - 88 },
    };
  }

  const rect = jar.getBoundingClientRect();
  return {
    mouth: {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.14,
    },
    interior: {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
    },
  };
}

function quadBezier(p0: number, p1: number, p2: number, t: number) {
  const inv = 1 - t;
  return inv * inv * p0 + 2 * inv * t * p1 + t * t * p2;
}

/** Authored in the CMS and handed over by Fireflies.astro as a data attribute. */
function readPhrases(): string[] {
  const raw = field?.dataset.phrases ?? '';
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * A shuffled deck rather than a random pick: random repeats within two or three
 * catches, which reads as a bug and kills the sense that there's more to find.
 */
function shufflePhraseDeck() {
  const last = phraseDeck[phraseDeck.length - 1];
  const next = readPhrases();

  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  // Don't open a new pass with the phrase that just closed the previous one.
  if (next.length > 1 && next[0] === last) {
    [next[0], next[1]] = [next[1], next[0]];
  }

  phraseDeck = next;
  phraseIndex = 0;
}

function nextPhrase(): string {
  if (phraseIndex >= phraseDeck.length) shufflePhraseDeck();
  return phraseDeck[phraseIndex++] ?? '';
}

function removePhrase(el: HTMLElement) {
  el.remove();
  phrases = phrases.filter((p) => p !== el);
}

function clearPhrases() {
  phrases.forEach((el) => el.remove());
  phrases = [];
}

function showPhrase(x: number, y: number) {
  const host = field ?? document.getElementById('firefly-field');
  const text = nextPhrase();
  if (!host || !text) return;

  const el = document.createElement('span');
  el.className = 'firefly-phrase';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = text;
  el.style.left = '0px';
  el.style.top = `${Math.max(56, y - 18)}px`;
  host.appendChild(el);

  // Measure once attached, then keep the whole label on screen — a firefly caught
  // near an edge still has to be readable.
  const width = el.getBoundingClientRect().width;
  const margin = 16;
  const half = width / 2;
  const minX = margin + half;
  const maxX = Math.max(minX, window.innerWidth - margin - half);
  el.style.left = `${clamp(x, minX, maxX)}px`;

  phrases.push(el);
  while (phrases.length > MAX_PHRASES) {
    const oldest = phrases.shift();
    oldest?.remove();
  }

  el.addEventListener('animationend', () => removePhrase(el), { once: true });
  // Backstop: animationend never fires if the element is never composited.
  window.setTimeout(() => removePhrase(el), PHRASE_MS + 300);
}

function collectFirefly(btn: HTMLButtonElement) {
  const entry = active.find((f) => f.el === btn);
  if (!entry) return;

  showPhrase(entry.x, entry.y);

  if (entry === netTarget) clearNetTarget();
  entry.collecting = true;
  window.clearTimeout(entry.lifespanTimer);
  active = active.filter((f) => f !== entry);

  btn.disabled = true;
  btn.style.pointerEvents = 'none';

  const startX = entry.x;
  const startY = entry.y;
  const { mouth, interior } = getJarEntryPoints();

  const finish = () => {
    btn.remove();
    const next = getFireflyCount() + 1;
    setFireflyCount(next);
    jarPulse();
    if (active.length === 0) stopMotionLoop();
  };

  if (reducedMotion) {
    finish();
    return;
  }

  const approachCpX = mouth.x + randomBetween(-24, 24);
  const approachCpY = Math.min(startY, mouth.y) - randomBetween(48, 110);
  const startTime = performance.now();
  const approachPhase = 0.48;

  const tick = (now: number) => {
    const t = clamp((now - startTime) / FLY_DURATION_MS, 0, 1);
    let x: number;
    let y: number;
    let scale = 1;
    let opacity = 1;

    if (t < approachPhase) {
      const localT = t / approachPhase;
      const eased = localT < 0.5 ? 2 * localT * localT : 1 - Math.pow(-2 * localT + 2, 2) / 2;
      x = quadBezier(startX, approachCpX, mouth.x, eased);
      y = quadBezier(startY, approachCpY, mouth.y, eased);
      scale = 1 - eased * 0.15;
    } else {
      const localT = (t - approachPhase) / (1 - approachPhase);
      const eased = localT * localT;
      x = mouth.x + (interior.x - mouth.x) * eased;
      y = mouth.y + (interior.y - mouth.y) * eased;
      scale = 0.85 - eased * 0.55;
      opacity = 1 - eased * 0.4;
    }

    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
    btn.style.transform = `translate(-50%, -50%) scale(${scale})`;
    btn.style.opacity = String(opacity);

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      finish();
    }
  };

  btn.style.transform = 'translate(-50%, -50%)';
  requestAnimationFrame(tick);
}

function jarPulse() {
  const jar = document.getElementById('firefly-jar');
  if (!jar) return;

  jar.classList.remove('is-collecting');
  window.clearTimeout(jarPulseTimer);

  requestAnimationFrame(() => {
    jar.classList.add('is-collecting');
    // Must come back off: the hover rule is gated on :not(.is-collecting),
    // so leaving it set kills the hover shake for the rest of the session.
    jarPulseTimer = window.setTimeout(
      () => jar.classList.remove('is-collecting'),
      JAR_PULSE_MS,
    );
  });
}

function fadeOutActive() {
  clearNetTarget();
  clearPhrases();
  active.forEach((entry) => {
    entry.el.classList.add('is-fading');
    window.setTimeout(() => removeFirefly(entry), 400);
  });
}

function onThoughtOpenChange() {
  // onLandingScreen() already accounts for thought-open, so the same
  // suspend/resume path covers both scrolling away and opening the overlay.
  updateJarVisibility();
  syncFireflyPresence();
}

export function initFireflies() {
  const el = document.getElementById('firefly-field');
  if (!el) return;

  window.clearTimeout(spawnTimer);
  stopMotionLoop();
  active.forEach((entry) => {
    window.clearTimeout(entry.lifespanTimer);
    entry.el.remove();
  });
  active = [];
  clearNetTarget();
  clearPhrases();

  field = el;
  // Re-read the deck so edited phrases take effect after a navigation.
  phraseDeck = [];
  phraseIndex = 0;
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  updateFireflyJar(getFireflyCount());
  initJarVisibility();
  initPointerNet();
  updateJarVisibility();

  if (!initialized) {
    initialized = true;

    const themeObserver = new MutationObserver(onThoughtOpenChange);
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  ambientSuspended = !onLandingScreen();
  if (ambientSuspended) return;

  scheduleSpawn();

  if (!reducedMotion && canSpawn()) {
    window.setTimeout(() => {
      if (canSpawn()) spawnFirefly();
    }, 1500);
  }
}

export function destroyFireflies() {
  window.clearTimeout(spawnTimer);
  stopMotionLoop();
  active.forEach((entry) => {
    window.clearTimeout(entry.lifespanTimer);
    entry.el.remove();
  });
  active = [];
  clearNetTarget();
  clearPhrases();
  // Escapes live on <body>, so they outlive a view transition unless cleared here.
  document.querySelectorAll('.firefly-escape').forEach((el) => el.remove());
  jarReleasing = false;
  field = null;
}
