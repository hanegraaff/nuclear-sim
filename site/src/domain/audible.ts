import { MAX_SURFACE_DISTANCE_KM } from "./blast";
import { sphericalCapAreaKm2 } from "./blastZones";

/** Audible experience bands, from faint outer edge toward ground zero. */
export type AudibleBandId = "faint" | "loud" | "painful" | "deafening";

/** Illustrative outdoor hearing band; all distances are surface kilometers. */
export interface AudibleBand {
  readonly id: AudibleBandId;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly peakSound: string;
  readonly innerKm: number;
  readonly outerKm: number;
  readonly areaKm2: number;
}

/** Prototype band fractions and experience copy, ordered from distant to near. */
export const AUDIBLE_BANDS = [
  { id: "faint", label: "FAINT", title: "FAINT RUMBLE", description: "Minutes later, a faint low rumble may be all that reaches you.", peakSound: "~45–75 dB peak", innerFactor: 0.72, outerFactor: 1 },
  { id: "loud", label: "LOUD", title: "DISTANT THUNDER", description: "A delayed low boom arrives like unnatural, sustained thunder.", peakSound: "~75–100 dB peak", innerFactor: 0.45, outerFactor: 0.72 },
  { id: "painful", label: "PAINFUL", title: "THUNDEROUS", description: "A cannon-like boom arrives late, then rolls across the horizon.", peakSound: "~100–120 dB peak", innerFactor: 0.22, outerFactor: 0.45 },
  { id: "deafening", label: "DEAFENING", title: "DEAFENING", description: "Pain, disorientation and permanent hearing damage are possible.", peakSound: "~120–140+ dB peak", innerFactor: 0, outerFactor: 0.22 },
] as const;

/** Estimate a bounded outdoor audible radius in km from per-warhead Mt and burst height in km. */
export function audibleRadiusKm(yieldMt: number, burstHeightKm = 0): number {
  if (!Number.isFinite(yieldMt) || yieldMt <= 0 || !Number.isFinite(burstHeightKm) || burstHeightKm < 0) {
    throw new RangeError("Audible model requires positive finite megatons and nonnegative finite burst height in km.");
  }
  return Math.min(MAX_SURFACE_DISTANCE_KM, 155 * yieldMt ** 0.32 * (1 + Math.min(0.18, burstHeightKm / 60)));
}

/** Convert a modeled radius in km into four non-overlapping spherical surface bands. */
export function audibleBands(radiusKm: number): readonly AudibleBand[] {
  if (!Number.isFinite(radiusKm) || radiusKm < 0 || radiusKm > MAX_SURFACE_DISTANCE_KM) throw new RangeError("Audible radius must be a finite Earth-surface distance in km.");
  return AUDIBLE_BANDS.map((band) => {
    const innerKm = radiusKm * band.innerFactor;
    const outerKm = radiusKm * band.outerFactor;
    return { ...band, innerKm, outerKm, areaKm2: sphericalCapAreaKm2(outerKm) - sphericalCapAreaKm2(innerKm) };
  });
}

/** Smooth normalized hearing intensity with a faint tail extending 12% beyond the modeled radius. */
export function audibleIntensity(normalizedDistance: number): number {
  if (!Number.isFinite(normalizedDistance) || normalizedDistance < 0) return 0;
  const stops = [[0, 1], [0.11, 0.875], [0.335, 0.625], [0.585, 0.375], [0.86, 0.125], [1, 0.04], [1.12, 0]] as const;
  for (let index = 1; index < stops.length; index++) {
    const [left, high] = stops[index - 1]!;
    const [right, low] = stops[index]!;
    if (normalizedDistance > right) continue;
    const t = (normalizedDistance - left) / (right - left);
    const smooth = t * t * (3 - 2 * t);
    return high + (low - high) * smooth;
  }
  return 0;
}
