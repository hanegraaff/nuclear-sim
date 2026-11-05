import { destinationPoint, EARTH_RADIUS_KM, type GeoPoint } from "./geodesy";

const GOLDEN_ANGLE_DEGREES = 137.507764;
const MAX_SPREAD_KM = Math.PI * EARTH_RADIUS_KM * 0.12;

/**
 * Place a modeled loadout around the clicked geographic aim point.
 * Distances are kilometers; count and light-damage radius come from the
 * selected catalog device. The fixed golden-angle pattern reproduces the
 * prototype's illustrative spread and stays stable across repeated launches.
 */
export function mirvImpactTargets(aim: GeoPoint, count: number, lightRadiusKm: number): readonly GeoPoint[] {
  if (!Number.isInteger(count) || count < 2 || !Number.isFinite(lightRadiusKm) || lightRadiusKm <= 0) {
    throw new RangeError("MIRV spread requires at least two warheads and a positive radius in kilometers.");
  }
  const spreadKm = Math.min(MAX_SPREAD_KM, Math.max(lightRadiusKm * 1.7, 8));
  return Array.from({ length: count }, (_, index) => {
    const normalized = Math.sqrt((index + 0.42) / count);
    const distanceKm = spreadKm * (0.28 + normalized * 0.72);
    return destinationPoint(aim, distanceKm, 18 + index * GOLDEN_ANGLE_DEGREES);
  });
}
