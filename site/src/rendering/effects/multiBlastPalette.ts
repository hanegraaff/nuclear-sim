import { combineBlastPeakAndSum } from "../../domain/overlap";

/** RGBA byte channels for the shared blast compositor. */
export interface MultiBlastColor { readonly red: number; readonly green: number; readonly blue: number; readonly alpha: number }

/** Single-reference anchors expressed in the domain's normalized damage intensity. */
const STOPS = [
  [0, 112, 73, 201, 0], [.14, 93, 59, 169, .36 * 255], [.34, 201, 40, 111, .46 * 255],
  [.58, 242, 63, 48, .62 * 255], [.88, 255, 167, 48, .84 * 255],
  [.9376, 255, 248, 204, .97 * 255], [1, 255, 255, 247, .995 * 255],
] as const;

/** Preserve domain intensity; mode alone never applies a dimming transfer. */
export function multiBlastDisplayIntensity(intensity: number): number { return Math.max(0, Math.min(1, intensity)); }

/** Bounded warm accent for actual overlap only, tapering to zero in already hot cores. */
export function multiBlastHueIntensity(display: number, peak: number, sum: number): number {
  return Math.min(1, display + Math.min(.16, Math.max(0, sum - peak) * 1.2) * Math.max(0, Math.min(1, (.7 - display) / .3)));
}

/** Interpolate the correct single-launch palette at a bounded normalized intensity. */
export function multiBlastColor(intensity: number): MultiBlastColor {
  const value = multiBlastDisplayIntensity(intensity);
  if (value === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  for (let index = 1; index < STOPS.length; index++) {
    const lower = STOPS[index - 1]!; const upper = STOPS[index]!;
    if (value > upper[0]) continue;
    const t = (value - lower[0]) / (upper[0] - lower[0]);
    const channel = (n: 1 | 2 | 3 | 4) => Math.round(lower[n] + (upper[n] - lower[n]) * t);
    return { red: channel(1), green: channel(2), blue: channel(3), alpha: channel(4) };
  }
  return { red: 255, green: 255, blue: 247, alpha: 254 };
}

/** Compose one RGBA sample. Isolated samples retain their exact single-field bytes, including the feather. */
export function composedBlastColor(peak: number, sum: number, base: MultiBlastColor): MultiBlastColor {
  if (peak <= 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  if (sum <= peak) return base;
  const display = combineBlastPeakAndSum(peak, sum);
  const warm = multiBlastColor(multiBlastHueIntensity(display, peak, sum));
  return { ...warm, alpha: Math.max(base.alpha, multiBlastColor(display).alpha) };
}

// 4,096 entries bound overlap quantization to one byte even at the narrow pale-core anchor.
const OVERLAP_STEPS = 4095;
const OVERLAP_COLORS = (() => {
  const colors = new Uint8ClampedArray((OVERLAP_STEPS + 1) * 4);
  for (let index = 0; index <= OVERLAP_STEPS; index++) {
    const color = multiBlastColor(index / OVERLAP_STEPS), offset = index * 4;
    colors[offset] = color.red; colors[offset + 1] = color.green; colors[offset + 2] = color.blue; colors[offset + 3] = color.alpha;
  }
  return colors;
})();

/** Write one composed RGBA sample without per-pixel allocations.
 * peak is a unit intensity and sum accumulates independent unit contributions;
 * offset addresses matching RGBA bytes in zero-initialized target and base.
 * Isolated bytes are exact; overlap lookup error is at most one byte.
 */
export function writeComposedBlastSample(target: Uint8ClampedArray, offset: number, peak: number, sum: number, base: Uint8ClampedArray): void {
  if (peak <= 0) return;
  if (sum <= peak) {
    target[offset] = base[offset]!; target[offset + 1] = base[offset + 1]!;
    target[offset + 2] = base[offset + 2]!; target[offset + 3] = base[offset + 3]!;
    return;
  }
  const display = combineBlastPeakAndSum(peak, sum);
  const colorOffset = Math.round(multiBlastHueIntensity(display, peak, sum) * OVERLAP_STEPS) * 4;
  const alphaOffset = Math.round(display * OVERLAP_STEPS) * 4;
  target[offset] = OVERLAP_COLORS[colorOffset]!; target[offset + 1] = OVERLAP_COLORS[colorOffset + 1]!;
  target[offset + 2] = OVERLAP_COLORS[colorOffset + 2]!; target[offset + 3] = Math.max(base[offset + 3]!, OVERLAP_COLORS[alphaOffset + 3]!);
}
