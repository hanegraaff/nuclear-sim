import { MAX_SURFACE_DISTANCE_KM } from "./blast";
import { EARTH_RADIUS_KM } from "./geodesy";
import { sphericalCapAreaKm2 } from "./blastZones";
import { audibleIntensity } from "./audible";

/** Direct-fireball viewing band, with geographic distances in kilometers. */
export interface VisibleBand {
  readonly id: VisibleBandId;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly visualLevel: string;
  readonly innerKm: number;
  readonly outerKm: number;
  readonly areaKm2: number;
}

/** Prototype viewing bands from faint horizon glow to the near blinding flash. */
export type VisibleBandId = "faint" | "clear" | "brilliant" | "blinding";

/** Read-only visible experience copy, ordered from the outer rim inward. */
export const VISIBLE_BANDS = [
  { id: "faint", label: "FAINT", title: "FAINT HORIZON GLOW", description: "Only a faint cold glow touches the horizon before vanishing.", visualLevel: "Faint horizon glow", innerFactor: 0.72, outerFactor: 1 },
  { id: "clear", label: "CLEAR", title: "DISTANT FIRELIGHT", description: "A hard blue-white pulse blooms low on the horizon.", visualLevel: "Clear distant glow", innerFactor: 0.45, outerFactor: 0.72 },
  { id: "brilliant", label: "BRILLIANT", title: "BRILLIANT HORIZON", description: "The fireball burns blue-white above the horizon; the scene flashes in its light.", visualLevel: "Brilliant direct glow", innerFactor: 0.22, outerFactor: 0.45 },
  { id: "blinding", label: "BLINDING", title: "BLINDING FLASH", description: "The sky turns white. Looking toward it can burn the retina.", visualLevel: "Sky-filling glare", innerFactor: 0, outerFactor: 0.22 },
] as const;

/** Surface distance in km to the tangent horizon from an above-ground height in km. */
export function curvatureHorizonKm(heightKm: number): number {
  if (!Number.isFinite(heightKm) || heightKm < 0) throw new RangeError("Horizon height must be finite and nonnegative kilometers.");
  return EARTH_RADIUS_KM * Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + Math.min(1_000_000, heightKm)));
}

/** Direct line-of-sight horizon in surface km to the luminous fireball top from a 1.7 m eye height. */
export function visibleRadiusKm(burstHeightKm: number, fireballRadiusKm: number, observerHeightKm = 0.0017): number {
  if (![burstHeightKm, fireballRadiusKm, observerHeightKm].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new RangeError("Visible horizon requires finite nonnegative kilometer heights and radius.");
  }
  return Math.min(MAX_SURFACE_DISTANCE_KM,
    curvatureHorizonKm(Math.min(1_000_000, burstHeightKm + fireballRadiusKm)) + curvatureHorizonKm(observerHeightKm));
}

/** Four non-overlapping viewing bands from a modeled direct-fireball horizon in km. */
export function visibleBands(radiusKm: number): readonly VisibleBand[] {
  if (!Number.isFinite(radiusKm) || radiusKm < 0 || radiusKm > MAX_SURFACE_DISTANCE_KM) throw new RangeError("Visible radius must be a finite Earth-surface distance in km.");
  return VISIBLE_BANDS.map((band) => {
    const innerKm = radiusKm * band.innerFactor;
    const outerKm = radiusKm * band.outerFactor;
    return { ...band, innerKm, outerKm, areaKm2: sphericalCapAreaKm2(outerKm) - sphericalCapAreaKm2(innerKm) };
  });
}

/** Smooth visibility intensity with the prototype's 12% feather past the direct horizon. */
export function visibleIntensity(normalizedDistance: number): number { return audibleIntensity(normalizedDistance); }
