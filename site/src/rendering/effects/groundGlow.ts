/** One premultiplied-free RGBA sample for illustrative ground lighting. */
export interface GroundGlowColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

interface ColorStop extends GroundGlowColor {
  readonly fraction: number;
}

const HALO_STOPS: readonly ColorStop[] = [
  { fraction: 0, red: 255, green: 255, blue: 255, alpha: 1 },
  { fraction: 0.12, red: 255, green: 252, blue: 215, alpha: 0.94 },
  { fraction: 0.36, red: 255, green: 217, blue: 100, alpha: 0.55 },
  { fraction: 0.72, red: 255, green: 115, blue: 28, alpha: 0.22 },
  { fraction: 1, red: 255, green: 70, blue: 16, alpha: 0 },
];

const CORE_STOPS: readonly ColorStop[] = [
  { fraction: 0, red: 255, green: 255, blue: 255, alpha: 1 },
  { fraction: 0.48, red: 255, green: 255, blue: 249, alpha: 0.99 },
  { fraction: 0.82, red: 255, green: 244, blue: 169, alpha: 0.86 },
  { fraction: 1, red: 255, green: 171, blue: 57, alpha: 0 },
];

/** Interpolate the prototype's radial light stops at a dimensionless fraction. */
function sampleStops(fraction: number, stops: readonly ColorStop[]): GroundGlowColor {
  if (fraction >= 1) return { red: 0, green: 0, blue: 0, alpha: 0 };
  const upperIndex = stops.findIndex((stop) => fraction <= stop.fraction);
  const lower = stops[Math.max(0, upperIndex - 1)]!;
  const upper = stops[Math.max(0, upperIndex)]!;
  const amount = upper.fraction === lower.fraction ? 0 : (fraction - lower.fraction) / (upper.fraction - lower.fraction);
  return {
    red: lower.red + (upper.red - lower.red) * amount,
    green: lower.green + (upper.green - lower.green) * amount,
    blue: lower.blue + (upper.blue - lower.blue) * amount,
    alpha: lower.alpha + (upper.alpha - lower.alpha) * amount,
  };
}

/**
 * Sample the screen-composited white core and warm halo at a geographic ground
 * distance in kilometers. The radii are optical presentation sizes, not
 * physical damage thresholds; values outside the halo are transparent.
 */
export function groundGlowColor(distanceKm: number, coreRadiusKm: number, haloRadiusKm: number): GroundGlowColor {
  if (!Number.isFinite(distanceKm) || distanceKm < 0 || !Number.isFinite(coreRadiusKm) || coreRadiusKm <= 0
    || !Number.isFinite(haloRadiusKm) || haloRadiusKm <= coreRadiusKm) {
    return { red: 0, green: 0, blue: 0, alpha: 0 };
  }
  const halo = sampleStops(distanceKm / haloRadiusKm, HALO_STOPS);
  const core = sampleStops(distanceKm / coreRadiusKm, CORE_STOPS);
  const alpha = core.alpha + halo.alpha * (1 - core.alpha);
  if (alpha <= 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  const haloWeight = halo.alpha * (1 - core.alpha);
  return {
    red: Math.round((core.red * core.alpha + halo.red * haloWeight) / alpha),
    green: Math.round((core.green * core.alpha + halo.green * haloWeight) / alpha),
    blue: Math.round((core.blue * core.alpha + halo.blue * haloWeight) / alpha),
    alpha,
  };
}
