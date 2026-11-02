import { EARTH_RADIUS_KM } from "./geodesy";

/**
 * Estimate the prototype's framing horizon in kilometers from a per-warhead
 * yield in megatons and a warhead count. This is a camera aid, not a damage forecast.
 */
export function scenarioHorizonKm(warheadYieldMt: number, warheadCount: number): number {
  if (!Number.isFinite(warheadYieldMt) || warheadYieldMt <= 0 || !Number.isInteger(warheadCount) || warheadCount < 1) {
    throw new RangeError("Scenario scale requires a positive yield and warhead count.");
  }
  const surfaceLimitKm = Math.PI * EARTH_RADIUS_KM - 1;
  const lightKm = Math.min(surfaceLimitKm, Math.max(0.001, 4.8 * Math.cbrt(Math.max(warheadYieldMt, 1e-12) / 0.01)));
  return Math.min(surfaceLimitKm, lightKm * (warheadCount > 1 ? 3 : 1.08));
}
