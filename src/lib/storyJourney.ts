
let cleanup: (() => void) | undefined;
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** One scroll timeline delivers the artwork, then its explanation, then the next beat. */
export function initStoryJourney() {
  cleanup?.();
  const scene = document.querySelector<HTMLElement>('.story-scene');
  const svg = scene?.querySelector('svg');
  const traveller = scene?.querySelector<SVGGElement>('.story-scene__traveller');
  const chapters = [...document.querySelectorAll<HTMLElement>('.chapter')];
  if (!scene || !svg || !traveller || !chapters.length) return;
  const embers = [...scene.querySelectorAll<SVGCircleElement>('.story-scene__ember')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let starts: number[] = [];
  let ends: number[] = [];
  let desktop = false;
  const root = document.documentElement;

  const update = () => {
    const h = innerHeight;
    const y = scrollY;
    chapters.forEach((chapter, i) => {
      // Artwork resolves before the reader reaches the pinned chapter.
      const image = ease((y - starts[i] + h * 0.8) / (h * 0.65));
      const copy = desktop
        ? ease((y - starts[i] - h * 0.05) / (h * 0.32))
        : ease((h * 0.94 - chapter.querySelector<HTMLElement>('.chapter__content')!.getBoundingClientRect().top) / (h * 0.22));
      chapter.style.setProperty('--image-reveal', String(motion.matches ? 1 : image));
      chapter.style.setProperty('--copy-reveal', String(motion.matches ? 1 : copy));
      // Invisible controls must not receive focus; focus already inside is preserved.
      const visual = chapter.querySelector<HTMLElement>('.chapter__visual')!;
      const content = chapter.querySelector<HTMLElement>('.chapter__content')!;
      visual.inert = !motion.matches && image === 0 && !visual.contains(document.activeElement);
      content.inert = !motion.matches && copy === 0 && !content.contains(document.activeElement);
    });
    const first = starts[0] - h * 0.75;
    const last = ends[ends.length - 1];
    const progress = clamp((y - first) / Math.max(1, last - first));
    svg.setAttribute('viewBox', `0 0 ${innerWidth} ${h}`);
    // Stay in the gutter between image and copy, never behind either one.
    const pointAt = (p: number) => ({
      x: desktop ? innerWidth * 0.5 + Math.sin(p * Math.PI * 4) * 12 * p : innerWidth - 12,
      y: h * (0.17 + 0.65 * p ** 1.4),
    });
    const point = pointAt(progress);
    const scale = 0.3 + 1.1 * progress ** 1.4;
    traveller.setAttribute('transform', `translate(${point.x} ${point.y}) scale(${scale})`);
    traveller.style.setProperty('--traveller-depth', String(progress));
    embers.forEach((ember, i) => {
      const k = (i + 1) / embers.length;
      const at = pointAt(Math.max(0, progress - k * 0.12));
      ember.setAttribute('cx', String(at.x));
      ember.setAttribute('cy', String(at.y));
      ember.setAttribute('r', String(5 * scale * (1 - k * 0.7)));
      ember.style.opacity = String(0.35 * (1 - k) * Math.min(1, progress * 8));
    });
    scene.classList.toggle('is-active', !motion.matches && y >= first && y < last + h * 0.75);
  };

  const measure = () => {
    desktop = innerWidth > 900 && !motion.matches;
    chapters.forEach(chapter => {
      const content = chapter.querySelector<HTMLElement>('.chapter__content')!;
      const copy = chapter.querySelector<HTMLElement>('.chapter__content-inner')!;
      const style = getComputedStyle(content);
      const height = Math.max(innerHeight, copy.offsetHeight + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom));
      chapter.style.setProperty('--chapter-height', `${height}px`);
      chapter.style.setProperty('--chapter-top', `${Math.min(0, innerHeight - height)}px`);
    });
    starts = chapters.map(chapter => chapter.getBoundingClientRect().top + scrollY);
    ends = chapters.map((chapter, i) => desktop
      ? starts[i] + chapter.offsetHeight - innerHeight
      : starts[i] + chapter.offsetHeight - innerHeight * 0.5);
    update();
  };
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
  root.classList.add('story-reveal');
  measure();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure);
  motion.addEventListener('change', measure);
  const observer = new ResizeObserver(measure);
  chapters.forEach(chapter => observer.observe(chapter.querySelector('.chapter__content-inner')!));
  cleanup = () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', measure);
    motion.removeEventListener('change', measure);
    root.classList.remove('story-reveal');
  };
}
document.addEventListener('astro:before-swap', () => cleanup?.());
