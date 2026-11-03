import { blastRadiiForYield, MAX_SURFACE_DISTANCE_KM } from "./blast";

/**
 * Estimate the prototype's framing horizon in kilometers from a per-warhead
 * yield in megatons and a warhead count. This is a camera aid, not a damage forecast.
 */
export function scenarioHorizonKm(warheadYieldMt: number, warheadCount: number): number {
  if (!Number.isFinite(warheadYieldMt) || warheadYieldMt <= 0 || !Number.isInteger(warheadCount) || warheadCount < 1) {
    throw new RangeError("Scenario scale requires a positive yield and warhead count.");
  }
  const surfaceLimitKm = MAX_SURFACE_DISTANCE_KM - 1;
  const lightKm = blastRadiiForYield(warheadYieldMt).light;
  return Math.min(surfaceLimitKm, lightKm * (warheadCount > 1 ? 3 : 1.08));
}
