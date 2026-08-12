/**
 * Builds one continuous path that travels around the screen
 * (top → right → bottom → left), staying out of the center text band.
 * Coordinates are in CSS pixels for the current viewport.
 */
export function buildThoughtLinePath(width: number, height: number) {
  const w = Math.max(width, 320);
  const h = Math.max(height, 480);
  const isMobile = w < 720;

  const insetX = isMobile ? w * 0.06 : w * 0.04;
  const topY = isMobile ? h * 0.11 : h * 0.1;
  const botY = isMobile ? h * 0.89 : h * 0.9;
  const midRight = w - insetX;
  const midLeft = insetX;

  // Wave control points along top (left → right)
  const t1 = w * 0.22;
  const t2 = w * 0.5;
  const t3 = w * 0.78;
  const topAmp = isMobile ? h * 0.035 : h * 0.045;

  // Wave control points along bottom (right → left)
  const b1 = w * 0.78;
  const b2 = w * 0.5;
  const b3 = w * 0.22;
  const botAmp = isMobile ? h * 0.035 : h * 0.045;

  // Right edge mid, left edge mid
  const rightMidY = h * 0.5;
  const leftMidY = h * 0.5;

  return [
    `M ${midLeft.toFixed(1)} ${topY.toFixed(1)}`,
    // Top edge wave, left → right
    `C ${(midLeft + t1) / 2} ${(topY - topAmp).toFixed(1)}, ${t1.toFixed(1)} ${(topY + topAmp).toFixed(1)}, ${t1.toFixed(1)} ${topY.toFixed(1)}`,
    `S ${t2.toFixed(1)} ${(topY - topAmp).toFixed(1)}, ${t2.toFixed(1)} ${topY.toFixed(1)}`,
    `S ${t3.toFixed(1)} ${(topY + topAmp).toFixed(1)}, ${t3.toFixed(1)} ${topY.toFixed(1)}`,
    `S ${((t3 + midRight) / 2).toFixed(1)} ${(topY - topAmp * 0.6).toFixed(1)}, ${midRight.toFixed(1)} ${topY.toFixed(1)}`,
    // Right edge, top → bottom (curves around the text)
    `C ${(midRight + w * 0.02).toFixed(1)} ${(topY + h * 0.12).toFixed(1)}, ${(midRight + w * 0.02).toFixed(1)} ${(rightMidY - h * 0.08).toFixed(1)}, ${midRight.toFixed(1)} ${rightMidY.toFixed(1)}`,
    `C ${(midRight + w * 0.02).toFixed(1)} ${(rightMidY + h * 0.08).toFixed(1)}, ${(midRight + w * 0.02).toFixed(1)} ${(botY - h * 0.12).toFixed(1)}, ${midRight.toFixed(1)} ${botY.toFixed(1)}`,
    // Bottom edge wave, right → left
    `C ${((midRight + b1) / 2).toFixed(1)} ${(botY + botAmp).toFixed(1)}, ${b1.toFixed(1)} ${(botY - botAmp).toFixed(1)}, ${b1.toFixed(1)} ${botY.toFixed(1)}`,
    `S ${b2.toFixed(1)} ${(botY + botAmp).toFixed(1)}, ${b2.toFixed(1)} ${botY.toFixed(1)}`,
    `S ${b3.toFixed(1)} ${(botY - botAmp).toFixed(1)}, ${b3.toFixed(1)} ${botY.toFixed(1)}`,
    `S ${((b3 + midLeft) / 2).toFixed(1)} ${(botY + botAmp * 0.6).toFixed(1)}, ${midLeft.toFixed(1)} ${botY.toFixed(1)}`,
    // Left edge, bottom → top — finishes near the start
    `C ${(midLeft - w * 0.02).toFixed(1)} ${(botY - h * 0.12).toFixed(1)}, ${(midLeft - w * 0.02).toFixed(1)} ${(leftMidY + h * 0.08).toFixed(1)}, ${midLeft.toFixed(1)} ${leftMidY.toFixed(1)}`,
    `C ${(midLeft - w * 0.02).toFixed(1)} ${(leftMidY - h * 0.08).toFixed(1)}, ${(midLeft - w * 0.02).toFixed(1)} ${(topY + h * 0.12).toFixed(1)}, ${midLeft.toFixed(1)} ${topY.toFixed(1)}`,
  ].join(' ');
}

export function strokeWidthForViewport(width: number) {
  if (width < 480) return 4;
  if (width < 900) return 5;
  return 7;
}
