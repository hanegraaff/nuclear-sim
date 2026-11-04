import { blastRadiiForYield } from "./blast";

/** Inputs for one modeled cloud; yield is per impact in megatons and height is km. */
export interface CloudProfileInput {
  readonly warheadYieldMt: number;
  readonly burstHeightKm: number;
  readonly nuclear: boolean;
}

/** Illustrative peak height above the surface in kilometers for one impact. */
export interface CloudPeak {
  readonly heightKm: number;
  readonly orbitalScale: boolean;
}

/**
 * Estimate a display height, not a weather forecast. The atmospheric term follows
 * the prototype's logarithmic nuclear and cube-root conventional scales; the
 * visible fireball top is a lower bound. Extreme study yields are capped at
 * 1,000,000 km to keep the visual instrument finite.
 */
export function cloudPeakForProfile(profile: CloudProfileInput): CloudPeak {
  const { warheadYieldMt, burstHeightKm, nuclear } = profile;
  if (!Number.isFinite(warheadYieldMt) || warheadYieldMt <= 0 || !Number.isFinite(burstHeightKm) || burstHeightKm < 0) {
    throw new RangeError("Cloud profile requires positive finite megatons and nonnegative finite burst kilometers.");
  }
  const atmosphericHeightKm = nuclear
    ? burstHeightKm + 7.5 + 8.4 * Math.log10(1 + warheadYieldMt / 0.01)
    : burstHeightKm + 0.12 * Math.cbrt(warheadYieldMt / 0.000011);
  const fireballTopKm = burstHeightKm + blastRadiiForYield(warheadYieldMt).fireball;
  const heightKm = Math.min(1_000_000, Math.max(atmosphericHeightKm, fireballTopKm));
  return { heightKm, orbitalScale: heightKm > 120 };
}

/** Monotone, normalized cloud rise from blast progress in [0, 1]. */
export function cloudGrowthAt(progress: number): number {
  if (!Number.isFinite(progress)) throw new RangeError("Cloud progress must be finite.");
  const bounded = Math.min(1, Math.max(0, progress));
  return 1 - (1 - bounded) ** 2.45;
}
