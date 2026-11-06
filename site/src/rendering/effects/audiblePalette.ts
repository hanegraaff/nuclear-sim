import { audibleIntensity } from "../../domain/audible";
import { combineBlastPeakAndSum } from "../../domain/overlap";

/** RGBA channels of the prototype's green hearing field at normalized intensity. */
export type AudibleColor = readonly [number, number, number, number];

const STOPS = [
  [0, 18, 61, 42], [0.4, 33, 166, 94], [0.72, 114, 255, 154], [1, 225, 255, 233],
] as const;

/** Interpolate the same continuous dark-green-to-mint palette used by the legend. */
export function audibleColor(intensity: number): AudibleColor {
  const value = Math.max(0, Math.min(1, intensity));
  if (!Number.isFinite(value) || value <= 0) return [18, 61, 42, 0];
  for (let index = 1; index < STOPS.length; index++) {
    const left = STOPS[index - 1]!;
    const right = STOPS[index]!;
    if (value > right[0]) continue;
    const fraction = (value - left[0]) / (right[0] - left[0]);
    const red = Math.round(left[1] + (right[1] - left[1]) * fraction);
    const green = Math.round(left[2] + (right[2] - left[2]) * fraction);
    const blue = Math.round(left[3] + (right[3] - left[3]) * fraction);
    const feather = Math.min(1, value / 0.04);
    const alpha = Math.round((70 + 177 * value ** 0.8) * feather ** 2 * (3 - 2 * feather));
    return [red, green, blue, alpha];
  }
  return [225, 255, 233, 247];
}

/** Bound order-independent hearing overlap before one palette lookup. */
export function audibleComposite(intensities: readonly number[]): number {
  let peak = 0;
  let sum = 0;
  for (const raw of intensities) {
    const value = Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : 0));
    peak = Math.max(peak, value); sum += value;
  }
  return combineBlastPeakAndSum(peak, sum);
}

/** Sample the physically normalized field then color it for one or more distances. */
export function audibleColorAtDistances(normalizedDistances: readonly number[]): AudibleColor {
  return audibleColor(audibleComposite(normalizedDistances.map(audibleIntensity)));
}

/** CSS gradient matching the raster palette for the four-band hearing legend. */
export const AUDIBLE_GRADIENT = "linear-gradient(90deg, rgb(18,61,42) 0%, rgb(33,166,94) 40%, rgb(114,255,154) 72%, rgb(225,255,233) 100%)";
