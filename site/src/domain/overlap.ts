import type { BlastRadii } from "./blast";

/**
 * Normalized damage-band intensity at a surface distance in kilometers.
 * The piecewise anchors reproduce the prototype's visual field and are not
 * estimates of structural damage probability.
 */
export function blastDamageIntensity(distanceKm: number, radii: BlastRadii): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 0;
  const interpolate = (inner: number, outer: number, high: number, low: number): number => {
    const fraction = Math.max(0, Math.min(1, (distanceKm - inner) / Math.max(0.0001, outer - inner)));
    return high + (low - high) * fraction;
  };
  if (distanceKm <= radii.fireball) return interpolate(0, radii.fireball, 1, 0.88);
  if (distanceKm <= radii.severe) return interpolate(radii.fireball, radii.severe, 0.88, 0.58);
  if (distanceKm <= radii.moderate) return interpolate(radii.severe, radii.moderate, 0.58, 0.34);
  if (distanceKm <= radii.light) return interpolate(radii.moderate, radii.light, 0.34, 0.14);
  return 0;
}

/**
 * Combine independent normalized fields without adding weapon yields.
 * The strongest field keeps its identity; weaker overlap brightens the result
 * with the prototype's bounded exponential response.
 */
export function combineBlastIntensities(intensities: readonly number[]): number {
  let peak = 0;
  let sum = 0;
  for (const raw of intensities) {
    const intensity = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
    peak = Math.max(peak, intensity);
    sum += intensity;
  }
  return combineBlastPeakAndSum(peak, sum);
}

/** Apply the same bounded composition to a peak and sum accumulated per sample. */
export function combineBlastPeakAndSum(peak: number, sum: number): number {
  const overlap = Math.max(0, sum - peak);
  return Math.max(0, Math.min(1, peak + (1 - peak) * (1 - Math.exp(-overlap * 0.5))));
}
