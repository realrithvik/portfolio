function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Builds one continuous path that travels around the screen
 * (top → right → bottom → left), staying out of the center text band.
 * Coordinates are in CSS pixels for the current viewport.
 *
 * Corners are explicit arcs rather than a side effect of the edge curves. An
 * earlier version bowed the sides by a fraction of the *width*, which collapsed
 * to a few pixels on a phone while the top and bottom waves kept their full
 * amplitude — the sides went flat, the corners turned into sharp kinks, and the
 * loop read as broken rather than drawn.
 */
export function buildThoughtLinePath(width: number, height: number) {
  const w = Math.max(width, 320);
  const h = Math.max(height, 480);
  const isMobile = w < 720;

  const insetX = isMobile ? w * 0.05 : w * 0.04;
  const topY = isMobile ? h * 0.11 : h * 0.1;
  const botY = isMobile ? h * 0.89 : h * 0.9;
  const right = w - insetX;
  const left = insetX;

  // Corner radius from the *smaller* axis so it survives a narrow viewport.
  const r = clamp(Math.min(w, h) * 0.08, 26, 96);
  // Outward bow on the vertical edges, with a floor so it never goes flat.
  const bow = Math.max(w * 0.018, 12);
  const amp = isMobile ? h * 0.03 : h * 0.045;

  const startX = left + r;
  const endX = right - r;
  const span = endX - startX;
  const lead = span * 0.12;

  // Wave crests along the horizontal runs
  const t1 = startX + span * 0.25;
  const t2 = startX + span * 0.5;
  const t3 = startX + span * 0.75;

  const vTop = topY + r;
  const vBot = botY - r;
  const vSpan = vBot - vTop;

  const n = (value: number) => value.toFixed(1);

  return [
    `M ${n(startX)} ${n(topY)}`,

    // Top edge, left → right
    `C ${n(startX + lead)} ${n(topY - amp)}, ${n(t1 - lead)} ${n(topY + amp)}, ${n(t1)} ${n(topY)}`,
    `S ${n(t2 - lead)} ${n(topY - amp)}, ${n(t2)} ${n(topY)}`,
    `S ${n(t3 - lead)} ${n(topY + amp)}, ${n(t3)} ${n(topY)}`,
    `S ${n(endX - lead)} ${n(topY - amp * 0.6)}, ${n(endX)} ${n(topY)}`,

    // Top-right corner
    `Q ${n(right)} ${n(topY)}, ${n(right)} ${n(vTop)}`,
    // Right edge, bowed outward
    `C ${n(right + bow)} ${n(vTop + vSpan * 0.33)}, ${n(right + bow)} ${n(vBot - vSpan * 0.33)}, ${n(right)} ${n(vBot)}`,
    // Bottom-right corner
    `Q ${n(right)} ${n(botY)}, ${n(endX)} ${n(botY)}`,

    // Bottom edge, right → left
    `C ${n(endX - lead)} ${n(botY + amp)}, ${n(t3 + lead)} ${n(botY - amp)}, ${n(t3)} ${n(botY)}`,
    `S ${n(t2 + lead)} ${n(botY + amp)}, ${n(t2)} ${n(botY)}`,
    `S ${n(t1 + lead)} ${n(botY - amp)}, ${n(t1)} ${n(botY)}`,
    `S ${n(startX + lead)} ${n(botY + amp * 0.6)}, ${n(startX)} ${n(botY)}`,

    // Bottom-left corner
    `Q ${n(left)} ${n(botY)}, ${n(left)} ${n(vBot)}`,
    // Left edge, bowed outward
    `C ${n(left - bow)} ${n(vBot - vSpan * 0.33)}, ${n(left - bow)} ${n(vTop + vSpan * 0.33)}, ${n(left)} ${n(vTop)}`,
    // Top-left corner, closing on the start point
    `Q ${n(left)} ${n(topY)}, ${n(startX)} ${n(topY)}`,
  ].join(' ');
}

export function strokeWidthForViewport(width: number) {
  if (width < 480) return 4;
  if (width < 900) return 5;
  return 7;
}
