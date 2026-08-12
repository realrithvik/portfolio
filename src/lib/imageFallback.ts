/**
 * Project imagery is optional — every <img> is paired with a sibling
 * placeholder that shows until (and unless) the real file loads.
 */
export function initImageFallbacks(selector: string) {
  document.querySelectorAll<HTMLImageElement>(selector).forEach((img) => {
    const placeholder = img.nextElementSibling as HTMLElement | null;

    const show = (loaded: boolean) => {
      img.style.display = loaded ? 'block' : 'none';
      if (placeholder) placeholder.style.display = loaded ? 'none' : 'flex';
    };

    img.addEventListener('error', () => show(false));

    if (img.complete) show(img.naturalWidth > 0);
  });
}
