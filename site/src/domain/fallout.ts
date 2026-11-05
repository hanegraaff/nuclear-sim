import { MAX_SURFACE_DISTANCE_KM } from "./blast";
import { destinationPoint, normalizeLongitude, surfaceDistanceKm, type GeoPoint } from "./geodesy";

/** Deterministic climatological transport proxy; bearings are downwind degrees and speed km/h. */
export interface WindModel {
  readonly bearing: number;
  readonly surfaceBearing: number;
  readonly speedKph: number;
  readonly band: string;
  readonly direction: string;
  readonly curve: number;
}

/** H+24 illustrative surface-burst footprint dimensions in kilometers. */
export interface FalloutDimensions {
  readonly lengthKm: number;
  readonly widthKm: number;
  readonly localRadiusKm: number;
}

/** A prototype screening band; dose copy describes an idealized envelope, not a forecast. */
export interface FalloutBand {
  readonly id: FalloutBandId;
  readonly label: string;
  readonly description: string;
  readonly dose: string;
  readonly consequence: string;
  readonly threshold: number;
  readonly lengthFactor: number;
  readonly widthFactor: number;
}

/** Stable IDs shared by model inspection and application actions. */
export type FalloutBandId = "trace" | "elevated" | "high" | "extreme";

/** Nested bands ordered from outer deposition to hot core, matching the prototype. */
export const FALLOUT_BANDS: readonly FalloutBand[] = [
  { id: "trace", label: "CONTAMINATED", dose: "Below ~0.5 Gy", consequence: "No immediate sickness; cancer risk rises", threshold: 0.04, lengthFactor: 1, widthFactor: 1, description: "You feel nothing. Radioactive dust still enters lungs, food and water." },
  { id: "elevated", label: "ACUTE SICKNESS", dose: "~0.5–2 Gy", consequence: "Nausea, exhaustion and falling blood counts", threshold: 0.16, lengthFactor: 0.74, widthFactor: 0.72, description: "Nausea may begin within hours. Shelter and avoidance of contaminated dust reduce further exposure." },
  { id: "high", label: "CRITICAL DOSE", dose: "~2–6 Gy", consequence: "Severe radiation sickness; deaths increase", threshold: 0.38, lengthFactor: 0.48, widthFactor: 0.48, description: "Radiation sickness becomes severe. Without hospital care, survival falls sharply." },
  { id: "extreme", label: "LETHAL DOSE", dose: "Above ~6 Gy", consequence: "Death likely without specialist care", threshold: 0.72, lengthFactor: 0.24, widthFactor: 0.27, description: "Violent sickness can begin within hours. Deep shelter and specialist treatment are critical." },
];

/** One local Gaussian-like deposition lobe in east/north kilometers, with unitless strength. */
export interface FalloutPuff {
  readonly eastKm: number;
  readonly northKm: number;
  readonly radiusKm: number;
  readonly stretch: number;
  readonly bearing: number;
  readonly strength: number;
  readonly headingEast: number;
  readonly headingNorth: number;
}

/** Immutable modeled fallout field for one nuclear warhead; no rendering or browser data. */
export interface FalloutFootprint {
  readonly origin: GeoPoint;
  readonly wind: WindModel;
  readonly dimensions: FalloutDimensions;
  readonly puffs: readonly FalloutPuff[];
}

/** A nested downwind band with distances in km and illustrative area in km². */
export interface FalloutZone {
  readonly band: FalloutBand;
  readonly innerKm: number;
  readonly outerKm: number;
  readonly areaKm2: number;
}

/** Build inner-to-outer screening spans and approximate footprint areas for inspection. */
export function falloutZones(dimensions: FalloutDimensions): readonly FalloutZone[] {
  let previousLength = 0;
  let previousArea = 0;
  return [...FALLOUT_BANDS].reverse().map((band) => {
    const outerKm = dimensions.lengthKm * band.lengthFactor;
    const area = Math.PI * outerKm * dimensions.widthKm * band.widthFactor * 0.36
      + Math.PI * (dimensions.localRadiusKm * band.widthFactor) ** 2;
    const zone = { band, innerKm: previousLength, outerKm, areaKm2: Math.max(0, area - previousArea) };
    previousLength = outerKm;
    previousArea = area;
    return zone;
  });
}

/** Return repeatable transport direction from latitude bands and small longitude-dependent variation. */
export function prevailingWind(point: GeoPoint): WindModel {
  const latitude = Math.abs(point.latitude);
  const variation = Math.sin((point.longitude * 0.73 + point.latitude * 1.17) * Math.PI / 180) * 7;
  const north = point.latitude >= 0;
  const [base, speedKph, band, curve] = latitude < 7 ? [270, 12, "EQUATORIAL FLOW", north ? -7 : 7] as const
    : latitude < 30 ? [north ? 228 : 312, 26, "TRADE WIND", north ? -10 : 10] as const
      : latitude < 60 ? [north ? 76 : 104, 38, "PREVAILING WESTERLY", north ? 9 : -9] as const
        : [north ? 252 : 288, 31, "POLAR EASTERLY", north ? -8 : 8] as const;
  const bearing = ((base + variation) % 360 + 360) % 360;
  return { bearing, surfaceBearing: (bearing + curve * 1.9 + 360) % 360, speedKph, band, curve,
    direction: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(bearing / 45) % 8]! };
}

/** Prototype-calibrated 24-hour surface-burst screening dimensions for a positive yield in Mt. */
export function falloutDimensions(yieldMt: number, wind: WindModel): FalloutDimensions {
  if (!Number.isFinite(yieldMt) || yieldMt <= 0) throw new RangeError("Fallout yield must be positive finite megatons.");
  const scale = Math.cbrt(yieldMt / 0.01);
  const windScale = 0.82 + Math.min(1.45, wind.speedKph / 38) * 0.24;
  const widthKm = Math.min(MAX_SURFACE_DISTANCE_KM * 0.34, Math.max(0.35, 4.5 * scale));
  return { lengthKm: Math.min(MAX_SURFACE_DISTANCE_KM, Math.max(0.75, 31 * scale * windScale)), widthKm,
    localRadiusKm: Math.min(MAX_SURFACE_DISTANCE_KM * 0.2, Math.max(0.2, widthKm * 0.78)) };
}

/** Sample the curved downwind centerline at normalized H+24 distance [0,1]. */
export function falloutCenterline(field: Pick<FalloutFootprint, "origin" | "wind" | "dimensions">, progress: number): GeoPoint {
  const t = Math.max(0, Math.min(1, progress));
  if (t === 0) return field.origin;
  return destinationPoint(field.origin, field.dimensions.lengthKm * t, field.wind.bearing + field.wind.curve * t * 0.52);
}

/** Reproducible unit noise used only while constructing physical deposition lobes. */
const noise = (seed: number): number => {
  const n = Math.sin(seed * 12.9898) * 43758.5453;
  return n - Math.floor(n);
};

/** Smooth, nonperiodic unit noise in a physical grid; camera coordinates never enter the texture. */
function depositionNoise(east: number, north: number): number {
  const x = Math.floor(east);
  const y = Math.floor(north);
  const fx = east - x;
  const fy = north - y;
  const blendX = fx * fx * (3 - 2 * fx);
  const blendY = fy * fy * (3 - 2 * fy);
  const corner = (cx: number, cy: number): number => noise(cx * 127.1 + cy * 311.7);
  const top = corner(x, y) * (1 - blendX) + corner(x + 1, y) * blendX;
  const bottom = corner(x, y + 1) * (1 - blendX) + corner(x + 1, y + 1) * blendX;
  return top * (1 - blendY) + bottom * blendY;
}

/** Prototype radial deposition kernel; shared to avoid allocating stops for every sampled puff. */
const DEPOSITION_STOPS = [[0, 1], [0.24, 0.78], [0.58, 0.34], [0.82, 0.1], [1, 0]] as const;

/** Build bounded deterministic puffs in physical units, reproducing the prototype's local skirt and shear lobe. */
export function modelFallout(origin: GeoPoint, yieldMt: number, seed = 1): FalloutFootprint {
  const wind = prevailingWind(origin);
  const dimensions = falloutDimensions(yieldMt, wind);
  const puffs: FalloutPuff[] = [];
  const add = (distanceKm: number, bearing: number, radiusKm: number, strength: number, stretch = 1, orientation = bearing): void => {
    const radians = bearing * Math.PI / 180;
    puffs.push({ eastKm: distanceKm * Math.sin(radians), northKm: distanceKm * Math.cos(radians), radiusKm, strength, stretch, bearing: orientation,
      headingEast: Math.sin(orientation * Math.PI / 180), headingNorth: Math.cos(orientation * Math.PI / 180) });
  };
  add(0, 0, dimensions.localRadiusKm * 1.6, 0.18, 1.02);
  add(0, 0, dimensions.localRadiusKm * 0.86, 0.42, 1.08, wind.surfaceBearing);
  add(0, 0, dimensions.localRadiusKm * 0.32, 0.88, 1.12, wind.surfaceBearing);
  for (let i = 0; i <= 34; i++) {
    const t = i / 34;
    const bearing = wind.bearing + wind.curve * t * 0.52;
    const spread = dimensions.widthKm * (0.15 + 0.9 * Math.sin(Math.PI * t ** 0.86) ** 0.7);
    const strength = (0.025 + 0.13 * Math.exp(-t * 2.3)) * (0.55 + noise(seed * 23.7 + i * 5.91) * 0.85) * 0.68;
    add(dimensions.lengthKm * t, bearing, spread, strength, 1.12 + t * 1.35, wind.bearing + wind.curve * t);
    const plume = puffs[puffs.length - 1]!;
    const lateral = (noise(seed * 37.1 + i * 13.7) - 0.5) * spread * 0.28;
    const normal = (wind.bearing + wind.curve * t + 90) * Math.PI / 180;
    puffs[puffs.length - 1] = { ...plume, eastKm: plume.eastKm + lateral * Math.sin(normal), northKm: plume.northKm + lateral * Math.cos(normal) };
    if (i % 3 === 1) {
      const lateral = (noise(seed * 61.9 + i * 19.3) - 0.5) * spread * 1.24;
      const center = puffs[puffs.length - 1]!;
      const angle = (wind.bearing + wind.curve * t + 90) * Math.PI / 180;
      puffs.push({ ...center, eastKm: center.eastKm + lateral * Math.sin(angle), northKm: center.northKm + lateral * Math.cos(angle),
        radiusKm: spread * (0.2 + noise(seed + i) * 0.22), strength: strength * 0.55, stretch: 1.35 });
    }
  }
  for (let i = 1; i <= 11; i++) {
    const t = i / 11;
    add(dimensions.lengthKm * 0.34 * t, wind.surfaceBearing, dimensions.widthKm * (0.18 + 0.38 * Math.sin(Math.PI * t)),
      (0.03 + 0.04 * (1 - t)) * (0.85 + noise(seed * 81 + i) * 0.25), 1.25 + t * 0.7);
  }
  return { origin, wind, dimensions, puffs };
}

/** Convert geography to local great-circle displacement, in kilometers east and north of origin. */
export function falloutLocalPoint(origin: GeoPoint, point: GeoPoint): { readonly eastKm: number; readonly northKm: number } {
  const a = origin.latitude * Math.PI / 180;
  const b = point.latitude * Math.PI / 180;
  const d = normalizeLongitude(point.longitude - origin.longitude) * Math.PI / 180;
  const angle = Math.atan2(Math.sin(d) * Math.cos(b), Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(d));
  const distance = surfaceDistanceKm(origin, point);
  return { eastKm: distance * Math.sin(angle), northKm: distance * Math.cos(angle) };
}

/** Evaluate the unitless deposition field at a geographic point; output is bounded [0,1]. */
export function falloutIntensityAt(field: FalloutFootprint, point: GeoPoint): number {
  const local = falloutLocalPoint(field.origin, point);
  let raw = 0;
  for (const puff of field.puffs) {
    const east = local.eastKm - puff.eastKm;
    const north = local.northKm - puff.northKm;
    const along = (east * puff.headingEast + north * puff.headingNorth) / puff.stretch;
    const cross = east * puff.headingNorth - north * puff.headingEast;
    const radius = Math.hypot(along, cross) / puff.radiusKm;
    if (radius >= 1) continue;
    for (let i = 1; i < DEPOSITION_STOPS.length; i++) {
      const left = DEPOSITION_STOPS[i - 1]!;
      const right = DEPOSITION_STOPS[i]!;
      if (radius <= right[0]) {
        raw += puff.strength * (left[1] + (right[1] - left[1]) * (radius - left[0]) / (right[0] - left[0]));
        break;
      }
    }
  }
  if (raw === 0) return 0;
  // Fine deposition variation is fixed in physical coordinates, so contours
  // acquire the prototype's ragged margin without shimmering with the camera.
  // The ±12% modulation calibrates appearance only; H+24 screening spans and
  // areas remain the broad envelope, not a meteorological dose prediction.
  const textureKm = Math.max(0.015, field.dimensions.widthKm * 0.035);
  const east = local.eastKm / textureKm;
  const north = local.northKm / textureKm;
  const texture = 1 + 0.16 * (depositionNoise(east, north) - 0.5)
    + 0.08 * (depositionNoise(east * 2.3 + 19.1, north * 2.3 - 7.6) - 0.5);
  return Math.min(1, Math.pow(raw, 1.08) * 1.08 * texture);
}
