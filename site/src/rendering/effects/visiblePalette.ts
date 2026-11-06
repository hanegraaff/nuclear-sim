import { visibleIntensity } from "../../domain/visible";
import { combineBlastPeakAndSum } from "../../domain/overlap";

/** RGBA channels of the prototype's navy-to-ice-blue sightline field. */
export type VisibleColor = readonly [number, number, number, number];

const STOPS = [
  [0, 16, 45, 102], [0.4, 23, 111, 211], [0.72, 105, 189, 255], [1, 226, 244, 255],
] as const;

/** Interpolate the continuous visible palette from faint navy to the near white core. */
export function visibleColor(intensity: number): VisibleColor {
  const value = Math.max(0, Math.min(1, intensity));
  if (!Number.isFinite(value) || value <= 0) return [16, 45, 102, 0];
  for (let index = 1; index < STOPS.length; index++) {
    const left = STOPS[index - 1]!;
    const right = STOPS[index]!;
    if (value > right[0]) continue;
    const fraction = (value - left[0]) / (right[0] - left[0]);
    const red = Math.round(left[1] + (right[1] - left[1]) * fraction);
    const green = Math.round(left[2] + (right[2] - left[2]) * fraction);
    const blue = Math.round(left[3] + (right[3] - left[3]) * fraction);
    const feather = Math.min(1, value / 0.04);
    return [red, green, blue, Math.round((70 + 177 * value ** 0.8) * feather ** 2 * (3 - 2 * feather))];
  }
  return [226, 244, 255, 247];
}

/** Order-independent bounded overlap before one visible palette lookup. */
export function visibleComposite(intensities: readonly number[]): number {
  let peak = 0;
  let sum = 0;
  for (const raw of intensities) {
    const value = Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : 0));
    peak = Math.max(peak, value); sum += value;
  }
  return combineBlastPeakAndSum(peak, sum);
}

/** Visible color at normalized physical distances from one or more strikes. */
export function visibleColorAtDistances(normalizedDistances: readonly number[]): VisibleColor {
  return visibleColor(visibleComposite(normalizedDistances.map(visibleIntensity)));
}

/** CSS legend gradient derived from the same prototype color stops as the raster. */
export const VISIBLE_GRADIENT = "linear-gradient(90deg, rgb(16,45,102) 0%, rgb(23,111,211) 40%, rgb(105,189,255) 72%, rgb(226,244,255) 100%)";

const alphaByBlue = Uint8Array.from({ length: 256 }, (_, blue) => {
  const intensity = blue <= 211 ? Math.max(0, (blue - 102) * 0.4 / 109)
    : 0.4 + Math.min(1, (blue - 211) / 44) * 0.32;
  return visibleColor(intensity)[3];
});
const alphaByRedAtIce = Uint8Array.from({ length: 256 }, (_, red) =>
  visibleColor(0.72 + Math.max(0, Math.min(1, (red - 105) / 121)) * 0.28)[3]);

/** Restore visible palette opacity after pitched triangle clipping, using unpremultiplied source colors. */
export function restoreVisibleMeshAlpha(image: ImageData): void {
  const bytes = image.data;
  for (let offset = 0; offset < bytes.length; offset += 4) {
    // At the feathered rim very low coverage leaves unpremultiplied RGB
    // quantized to a few bright values. Keep that coverage rather than
    // promoting isolated antialiased samples into opaque blue speckles.
    if (bytes[offset + 3]! < 24) continue;
    bytes[offset + 3] = bytes[offset + 2]! < 255
      ? alphaByBlue[bytes[offset + 2]!]!
      : alphaByRedAtIce[bytes[offset]!]!;
  }
}
