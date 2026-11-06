import { destinationPoint, type GeoPoint } from "../domain/geodesy";
import type { Launch, LaunchFrame } from "./launch";
import { falloutZones, type FalloutZone } from "../domain/fallout";
import { audibleBands, audibleRadiusKm, type AudibleBand } from "../domain/audible";
import { visibleBands, visibleRadiusKm, type VisibleBand } from "../domain/visible";

/** View framing in geographic/physical units; map adapters choose actual zoom. */
export interface EffectCameraFrame {
  readonly center: GeoPoint;
  readonly horizonKm: number;
}

/** Frame the first retained nuclear footprint using the prototype's downwind framing policy. */
export function falloutCameraFrame(frames: readonly LaunchFrame[]): EffectCameraFrame | null {
  const field = frames.find(({ launch }) => launch.fallout)?.launch.fallout;
  if (!field) return null;
  return {
    center: destinationPoint(field.origin, field.dimensions.lengthKm * 0.5, field.wind.bearing + field.wind.curve * 0.22),
    horizonKm: Math.max(field.dimensions.widthKm * 1.35, field.dimensions.lengthKm * 0.78),
  };
}

/** Derive immutable physical spans/areas from the newest nuclear delivery for the multi-view legend. */
export function falloutLegendForFrames(frames: readonly LaunchFrame[]): readonly FalloutZone[] {
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    const field = frames[index]!.launch.fallout;
    if (field) return falloutZones(field.dimensions);
  }
  return [];
}

/** Frame the latest retained audible field from its modeled radius in km. */
export function audibleCameraFrame(frames: readonly LaunchFrame[]): EffectCameraFrame | null {
  const launch = frames.at(-1)?.launch;
  return launch ? { center: launch.route.target, horizonKm: audibleRadiusForLaunch(launch) * 1.08 } : null;
}

/** Return the latest delivery's hearing spans for the multi-strike legend. */
export function audibleLegendForFrames(frames: readonly LaunchFrame[]): readonly AudibleBand[] {
  const launch = frames.at(-1)?.launch;
  return launch ? audibleBands(audibleRadiusForLaunch(launch)) : [];
}

/** Frame the latest direct-fireball horizon in geographic kilometers. */
export function visibleCameraFrame(frames: readonly LaunchFrame[]): EffectCameraFrame | null {
  const launch = frames.at(-1)?.launch;
  return launch ? { center: launch.route.target, horizonKm: visibleRadiusForLaunch(launch) * 1.08 } : null;
}

/** Return the latest delivery's four visible experience bands for the multi legend. */
export function visibleLegendForFrames(frames: readonly LaunchFrame[]): readonly VisibleBand[] {
  const launch = frames.at(-1)?.launch;
  return launch ? visibleBands(visibleRadiusForLaunch(launch)) : [];
}

/** Direct luminous fireball horizon in km for one delivery, using its per-warhead blast radius. */
export function visibleRadiusForLaunch(launch: Pick<Launch, "deviceId" | "yieldMt" | "radii">): number {
  return visibleRadiusKm(burstHeightForLaunch(launch), launch.radii.fireball);
}

/** Apply the prototype's device-specific burst height (km) to one warhead's sound radius (km). */
export function audibleRadiusForLaunch(launch: Pick<Launch, "deviceId" | "yieldMt">): number {
  return audibleRadiusKm(launch.yieldMt, burstHeightForLaunch(launch));
}

/** Prototype burst-height policy in km shared by sound and direct-fireball sightlines. */
function burstHeightForLaunch(launch: Pick<Launch, "deviceId" | "yieldMt">): number {
  const { deviceId, yieldMt } = launch;
  const knownHeightKm: Record<string, number> = {
    moab: 0.003, foab: 0.003, "rs-24-yars": 1.05, "rsm-56-bulava": 0.92,
    "rs-28-sarmat": 1.45, w54: 0.012192, "little-boy": 0.58, "fat-man": 0.503,
  };
  const heightKm = knownHeightKm[deviceId]
    ?? Math.max(0.05, Math.min(12, 0.48 * Math.cbrt(yieldMt / 0.015)));
  return heightKm;
}
