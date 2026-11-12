/**
 * Project imagery is optional — every <img> is paired with a sibling
 * placeholder that shows until (and unless) the real file loads.
 *
 * The image is revealed by fading it in over the placeholder rather than by
 * being switched from `display: none`. A display:none image has no layout box,
 * so it never intersects the viewport, so `loading="lazy"` never fetches it —
 * which left every lazy image permanently hidden behind its placeholder.
 */
export function initImageFallbacks(selector: string) {
  document.querySelectorAll<HTMLImageElement>(selector).forEach((img) => {
    // The initialisers re-run on astro:page-load; don't stack listeners.
    if (img.dataset.fallbackBound) return;
    img.dataset.fallbackBound = 'true';

    const placeholder = img.nextElementSibling as HTMLElement | null;

    const show = (loaded: boolean) => {
      img.style.opacity = loaded ? '1' : '0';
      if (placeholder) placeholder.style.visibility = loaded ? 'hidden' : 'visible';
    };

    img.addEventListener('load', () => show(true));
    img.addEventListener('error', () => show(false));

    // Already settled by the time we got here (cached, or eager and decoded).
    if (img.complete) show(img.naturalWidth > 0);
  });
}
