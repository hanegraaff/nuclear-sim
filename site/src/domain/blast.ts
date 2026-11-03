import { EARTH_RADIUS_KM } from "./geodesy";

/** Nested surface radii in kilometers for one device yield in megatons. */
export interface BlastRadii {
  readonly fireball: number;
  readonly severe: number;
  readonly moderate: number;
  readonly light: number;
}

/** Largest meaningful great-circle distance on the modeled spherical Earth, in km. */
export const MAX_SURFACE_DISTANCE_KM = Math.PI * EARTH_RADIUS_KM;

/**
 * Estimate one impact's effect radii in km from a positive yield in Mt.
 * Constants match the prototype's 10 kt reference; these are illustrative scales.
 */
export function blastRadiiForYield(yieldMt: number): BlastRadii {
  if (!Number.isFinite(yieldMt) || yieldMt <= 0) throw new RangeError("Yield must be positive and finite megatons.");
  const relativeYield = yieldMt / 0.01;
  const scale = Math.cbrt(relativeYield);
  const bounded = (radius: number) => Math.min(MAX_SURFACE_DISTANCE_KM, Math.max(0.001, radius));
  const light = bounded(4.8 * scale);
  const moderate = Math.min(light, bounded(1.6 * scale));
  const severe = Math.min(moderate, bounded(0.8 * scale));
  const fireball = Math.min(severe, bounded(0.14 * relativeYield ** 0.4));
  return { fireball, severe, moderate, light };
}
