import { getDeviceById, perWarheadYieldMt } from "../catalog/devices";
import { cloudGrowthAt, cloudPeakForProfile, type CloudProfileInput } from "../domain/cloud";
import { resolveDeviceSelection } from "./deviceSelection";
import type { SimulatorState } from "./launch";

/** UI-ready cloud instrument values. Heights are kilometers above surface. */
export interface CloudPresentation {
  readonly peakHeightKm: number;
  readonly currentHeightKm: number;
  readonly progress: number;
  readonly growth: number;
  readonly nuclear: boolean;
  readonly warheadCount: number;
  readonly orbitalScale: boolean;
  readonly heightLabel: string;
  readonly plumeLabel: string;
  readonly phaseLabel: string;
  readonly qualificationLabel: string;
}

/** Format a nonnegative modeled height using the prototype's meter/km precision. */
export function formatCloudHeight(heightKm: number): string {
  if (heightKm < 1) return `${Math.round(heightKm * 1000)} m`;
  if (heightKm < 100) return `${heightKm.toFixed(heightKm < 10 ? 2 : 1)} km`;
  return `${Math.round(heightKm).toLocaleString("en-US")} km`;
}

/**
 * Resolve the burst profile of a selected or launched device. Named airbursts
 * match the prototype; all other nuclear bursts use its cube-root setting.
 */
function profileForDevice(deviceId: string, aggregateYieldMt: number): CloudProfileInput & { warheadCount: number } {
  const device = getDeviceById(deviceId);
  const warheadCount = device?.warheadCount ?? 1;
  const warheadYieldMt = device ? perWarheadYieldMt(device) : aggregateYieldMt;
  if (deviceId === "moab" || deviceId === "foab") {
    return { nuclear: false, warheadCount, warheadYieldMt, burstHeightKm: 0.003 };
  }
  const mirvHeightKm: Record<string, number> = { "rs-24-yars": 1.05, "rsm-56-bulava": 0.92, "rs-28-sarmat": 1.45 };
  const namedHeightKm: Record<string, number> = { w54: 0.012192, "little-boy": 0.58, "fat-man": 0.503 };
  const scaledHeightKm = Math.max(0.05, Math.min(12, 0.48 * Math.cbrt(warheadYieldMt / 0.015)));
  return {
    nuclear: true,
    warheadCount,
    warheadYieldMt,
    burstHeightKm: mirvHeightKm[deviceId] ?? namedHeightKm[deviceId] ?? scaledHeightKm,
  };
}

/**
 * Derive monitor state from the immutable launch timeline. Selection only sets
 * the standby scale; an active launch retains its own yield and device ID.
 */
export function cloudPresentationForState(state: SimulatorState): CloudPresentation {
  const selection = resolveDeviceSelection(state);
  const deviceId = state.launch?.deviceId ?? (selection.valid ? selection.device.id : "fat-man");
  const yieldMt = state.launch?.yieldMt ?? (selection.valid ? selection.device.yieldMt : 0.021);
  const profile = profileForDevice(deviceId, yieldMt);
  const peak = cloudPeakForProfile(profile);
  const blastElapsedMs = state.launch ? state.elapsedMs - state.launch.flightMs : 0;
  const progress = state.phase === "complete" ? 1
    : state.phase === "detonating" && state.launch ? Math.min(1, Math.max(0, blastElapsedMs / state.launch.blastMs)) : 0;
  const growth = cloudGrowthAt(progress);
  const plumeLabel = profile.nuclear ? peak.orbitalScale ? "LUMINOUS PLUME" : "MUSHROOM CLOUD" : "DETONATION PLUME";
  const phaseLabel = progress === 0 ? "STANDBY"
    : !profile.nuclear ? progress < 0.45 ? "SHOCK / DUST RISE" : progress < 1 ? "PLUME FORMATION" : "MODELED PEAK"
      : progress < 0.16 ? "FIREBALL" : progress < 0.46 ? "STEM RISE"
        : progress < 0.79 ? "CAP FORMATION" : progress < 1 ? "STABILIZING" : "MODELED PEAK";
  return {
    peakHeightKm: peak.heightKm,
    currentHeightKm: peak.heightKm * growth,
    progress,
    growth,
    nuclear: profile.nuclear,
    warheadCount: profile.warheadCount,
    orbitalScale: peak.orbitalScale,
    heightLabel: progress > 0 ? formatCloudHeight(peak.heightKm * growth) : "—",
    plumeLabel,
    phaseLabel,
    qualificationLabel: progress === 0 ? "HEIGHT REVEALS AT IGNITION"
      : profile.warheadCount > 1 ? `PER WARHEAD · ${profile.warheadCount} RVs` : "HEIGHT ABOVE SURFACE",
  };
}
