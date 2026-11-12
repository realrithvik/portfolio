/**
 * The invisible route the story dot travels along.
 *
 * Nothing here is ever painted — the path exists only to be measured with
 * `getPointAtLength`, so the dot and its comet tail have a curve to follow. The
 * sense of depth comes from the shape of that curve: samples bunch toward the
 * far end so distance compresses, and the horizontal swings widen as the path
 * nears, the way a receding curve does in perspective.
 */

const VIEW = 1000;

/**
 * Vanishing point, near the top centre — kept clear of the very top edge so the
 * distant end does not sit behind the site header on short viewports.
 */
const FAR_Y = 135;
/** Foreground end, pushed past the bottom edge; the dot stops short of it. */
const NEAR_Y = 1040;
/** Two complete winds — sin ends back at 0, so the route arrives centred. */
const WINDS = 2;

function samplePoint(t: number) {
  const centreX = VIEW / 2;
  // Distances compress toward the horizon.
  const depth = t ** 1.85;
  const y = FAR_Y + (NEAR_Y - FAR_Y) * depth;
  // A far-off curve barely deviates; the same curve up close is a wide sweep.
  const amplitude = 8 + 322 * t ** 1.4;
  const x = centreX + Math.sin(t * Math.PI * 2 * WINDS) * amplitude;
  return { x, y };
}

export interface StoryPathGeometry {
  /** Measured for geometry, never stroked or filled. */
  centerline: string;
  viewBox: string;
}

export function buildStoryPath(samples = 240): StoryPathGeometry {
  const points = Array.from({ length: samples + 1 }, (_, i) => samplePoint(i / samples));
  const n = (value: number) => value.toFixed(1);

  const centerline = [
    `M ${n(points[0].x)} ${n(points[0].y)}`,
    ...points.slice(1).map((p) => `L ${n(p.x)} ${n(p.y)}`),
  ].join(' ');

  return { centerline, viewBox: `0 0 ${VIEW} ${VIEW}` };
}
