import type { BlastRadii } from "./blast";
import { EARTH_RADIUS_KM } from "./geodesy";

/** The four nested blast effects, ordered from ground zero outward. */
export type BlastZoneId = "fireball" | "severe" | "moderate" | "light";

/** Physical span and spherical surface area of one annular effect zone. */
export interface BlastZone {
  readonly id: BlastZoneId;
  readonly innerKm: number;
  readonly outerKm: number;
  readonly areaKm2: number;
}

/** Surface area in square kilometers enclosed by a great-circle radius in km. */
export function sphericalCapAreaKm2(radiusKm: number): number {
  if (!Number.isFinite(radiusKm) || radiusKm < 0 || radiusKm > Math.PI * EARTH_RADIUS_KM) {
    throw new RangeError("Radius must be a finite Earth-surface distance in kilometers.");
  }
  // The sine form avoids subtracting nearly equal values for a tiny fireball.
  return 4 * Math.PI * EARTH_RADIUS_KM ** 2 * Math.sin(radiusKm / (2 * EARTH_RADIUS_KM)) ** 2;
}

/** Derive non-overlapping annuli from the model's four nested radii in km. */
export function blastZones(radii: BlastRadii): readonly BlastZone[] {
  const boundaries: readonly [BlastZoneId, number, number][] = [
    ["fireball", 0, radii.fireball],
    ["severe", radii.fireball, radii.severe],
    ["moderate", radii.severe, radii.moderate],
    ["light", radii.moderate, radii.light],
  ];
  return boundaries.map(([id, innerKm, outerKm]) => ({
    id,
    innerKm,
    outerKm,
    areaKm2: Math.max(0, sphericalCapAreaKm2(outerKm) - sphericalCapAreaKm2(innerKm)),
  }));
}
