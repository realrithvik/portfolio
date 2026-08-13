import Lenis from 'lenis';

let lenis: Lenis | null = null;
let rafId = 0;
let observer: MutationObserver | null = null;

/**
 * Lenis drives the *real* scroll position rather than transforming a wrapper, so
 * window.scrollY and native scroll events keep working — which matters here,
 * because fireflies.ts and the jar both gate on scrollY.
 */
export function initSmoothScroll() {
  destroySmoothScroll();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  lenis = new Lenis({
    // ~1s glide with a strong ease-out: quick to respond, long tail.
    duration: 1.05,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // Touch devices already have momentum scrolling; overriding it feels laggy.
    syncTouch: false,
    /**
     * The thought overlay scrolls its own container via scrollTop. Left alone,
     * Lenis would swallow the wheel events that drive it.
     */
    prevent: (node) => Boolean(node.closest?.('.thought-overlay__scroller')),
  });

  const raf = (time: number) => {
    lenis?.raf(time);
    rafId = requestAnimationFrame(raf);
  };
  rafId = requestAnimationFrame(raf);

  if (import.meta.env.DEV) {
    (window as unknown as { __lenis?: Lenis | null }).__lenis = lenis;
  }

  // body.thought-open sets overflow:hidden; stop Lenis so it isn't fighting a
  // locked page, and resume when the overlay closes.
  observer = new MutationObserver(() => {
    if (!lenis) return;
    if (document.body.classList.contains('thought-open')) lenis.stop();
    else lenis.start();
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('click', onAnchorClick);
}

/** In-page anchors must go through Lenis or they hard-jump past the animation. */
function onAnchorClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;

  const link = (event.target as HTMLElement | null)?.closest?.('a');
  const href = link?.getAttribute('href');
  if (!link || !href) return;

  // Same-page anchors only: "#work" here, or "/#work" when already on "/".
  const [path, hash] = href.split('#');
  if (!hash) return;
  if (path && path !== window.location.pathname && path !== '/') return;
  if (path === '/' && window.location.pathname !== '/') return;

  const target = document.getElementById(hash);
  if (!target || !lenis) return;

  event.preventDefault();
  lenis.scrollTo(target, { offset: 0 });
  history.pushState(null, '', `#${hash}`);
}

export function destroySmoothScroll() {
  cancelAnimationFrame(rafId);
  observer?.disconnect();
  observer = null;
  document.removeEventListener('click', onAnchorClick);
  lenis?.destroy();
  lenis = null;
}
