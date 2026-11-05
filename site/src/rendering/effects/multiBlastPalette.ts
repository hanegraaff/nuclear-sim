/** RGBA color of a normalized combined blast field sample. */
export interface MultiBlastColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

/** Prototype thermal stops ordered from faint purple to white-hot yellow. */
const THERMAL_STOPS: readonly (readonly [number, number, number, number, number])[] = [
  [0, 25, 5, 48, 0],
  [0.05, 48, 14, 92, 70],
  [0.16, 101, 24, 126, 112],
  [0.34, 191, 34, 107, 154],
  [0.54, 241, 54, 48, 190],
  [0.73, 255, 134, 38, 220],
  [0.88, 255, 222, 92, 236],
  [1, 255, 252, 224, 249],
];

/**
 * Compress the display response of a modeled overlap before palette lookup.
 * The geographic band radii and bounded domain intensity remain untouched;
 * this visual transfer keeps the prototype's yellow core local to clustered
 * impacts and lets the broad outer field stay translucent purple.
 */
export function multiBlastDisplayIntensity(modeledIntensity: number): number {
  return Math.max(0, Math.min(1, modeledIntensity)) ** 1.85;
}

/** Interpolate the prototype palette for a bounded visual intensity. */
export function multiBlastColor(intensity: number): MultiBlastColor {
  const value = Math.max(0, Math.min(1, intensity));
  if (value === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  for (let index = 1; index < THERMAL_STOPS.length; index += 1) {
    const lower = THERMAL_STOPS[index - 1]!;
    const upper = THERMAL_STOPS[index]!;
    if (value > upper[0]) continue;
    const fraction = (value - lower[0]) / (upper[0] - lower[0]);
    const channel = (position: 1 | 2 | 3 | 4) => Math.round(lower[position] + (upper[position] - lower[position]) * fraction);
    return { red: channel(1), green: channel(2), blue: channel(3), alpha: Math.max(20, Math.round(channel(4) * 0.96)) };
  }
  return { red: 255, green: 252, blue: 224, alpha: 239 };
}

/** Reusable 256-entry color table for the per-pixel multi-strike compositor. */
export const MULTI_BLAST_COLOR_LUT: Uint8ClampedArray = (() => {
  const colors = new Uint8ClampedArray(256 * 4);
  for (let index = 0; index < 256; index += 1) {
    const color = multiBlastColor(index / 255);
    const offset = index * 4;
    colors[offset] = color.red;
    colors[offset + 1] = color.green;
    colors[offset + 2] = color.blue;
    colors[offset + 3] = color.alpha;
  }
  return colors;
})();
