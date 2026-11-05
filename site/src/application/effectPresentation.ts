import { destinationPoint, type GeoPoint } from "../domain/geodesy";
import type { LaunchFrame } from "./launch";
import { falloutZones, type FalloutZone } from "../domain/fallout";

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
