import { falloutIntensityAtLocal, type FalloutFootprint } from "../../domain/fallout";
import { MAX_SURFACE_DISTANCE_KM } from "../../domain/blast";
import { destinationPoint, type GeoPoint } from "../../domain/geodesy";

/** A rectangular strike-local chart, in great-circle east/north kilometers. */
export interface FalloutTextureBounds {
  readonly westKm: number;
  readonly eastKm: number;
  readonly southKm: number;
  readonly northKm: number;
}

/** Immutable scalar texture and mesh anchors; its lifetime is independent of the camera. */
export interface FalloutTexture {
  readonly field: FalloutFootprint;
  readonly bounds: FalloutTextureBounds;
  readonly canvas: HTMLCanvasElement;
  readonly values: Float32Array;
  readonly mesh: readonly GeoPoint[];
  readonly meshColumns: number;
  readonly meshRows: number;
}

/** The fixed cache budget counts scalar texels, rather than viewport or strike size. */
export const FALLOUT_CACHE_TEXELS = 600_000;

/** Conservative lobe bounds include stretch and a transparent interpolation border. */
export function falloutTextureBounds(field: FalloutFootprint): FalloutTextureBounds {
  let westKm = Infinity; let eastKm = -Infinity;
  let southKm = Infinity; let northKm = -Infinity;
  for (const puff of field.puffs) {
    const eastRadius = puff.radiusKm * Math.hypot(puff.stretch * puff.headingEast, puff.headingNorth);
    const northRadius = puff.radiusKm * Math.hypot(puff.stretch * puff.headingNorth, puff.headingEast);
    westKm = Math.min(westKm, puff.eastKm - eastRadius);
    eastKm = Math.max(eastKm, puff.eastKm + eastRadius);
    southKm = Math.min(southKm, puff.northKm - northRadius);
    northKm = Math.max(northKm, puff.northKm + northRadius);
  }
  const padding = field.dimensions.widthKm * 0.02;
  return { westKm: westKm - padding, eastKm: eastKm + padding, southKm: southKm - padding, northKm: northKm + padding };
}

/** Convert a normalized texture coordinate into geography, including antimeridian wrapping. */
export function falloutTexturePoint(field: FalloutFootprint, bounds: FalloutTextureBounds, u: number, v: number): GeoPoint {
  const east = bounds.westKm + (bounds.eastKm - bounds.westKm) * u;
  const north = bounds.northKm - (bounds.northKm - bounds.southKm) * v;
  // The local great-circle chart is one-to-one only inside the antipodal disk.
  // Its transparent outside samples collapse onto the antipode rather than
  // folding a second copy of an extreme-yield field back onto the Earth.
  return destinationPoint(field.origin, Math.min(MAX_SURFACE_DISTANCE_KM, Math.hypot(east, north)), Math.atan2(east, north) * 180 / Math.PI);
}

/** Choose a camera-independent resolution within the scene's shared texel budget. */
export function falloutTextureSize(bounds: FalloutTextureBounds, texelBudget: number): { width: number; height: number } {
  const aspect = (bounds.eastKm - bounds.westKm) / (bounds.northKm - bounds.southKm);
  const width = Math.max(2, Math.min(320, Math.floor(texelBudget / 2), Math.floor(Math.sqrt(texelBudget * aspect))));
  const height = Math.max(2, Math.min(320, Math.floor(texelBudget / width)));
  return { width, height };
}

/**
 * Sample a complete strike-local scalar texture once. The red channel stores
 * intensity with opaque alpha, allowing Canvas `lighter` to sum fields before
 * palette lookup. A low-resolution preview and refined texture share bounds.
 */
export function buildFalloutTexture(field: FalloutFootprint, texelBudget: number): FalloutTexture {
  const bounds = falloutTextureBounds(field);
  const { width, height } = falloutTextureSize(bounds, texelBudget);
  const values = new Float32Array(width * height);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    const image = context.createImageData(width, height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const east = bounds.westKm + (bounds.eastKm - bounds.westKm) * x / (width - 1);
      const north = bounds.northKm - (bounds.northKm - bounds.southKm) * y / (height - 1);
      const index = y * width + x;
      const value = Math.hypot(east, north) < MAX_SURFACE_DISTANCE_KM ? falloutIntensityAtLocal(field, east, north) : 0;
      values[index] = value;
      image.data[index * 4] = Math.round(value * 255);
      image.data[index * 4 + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }
  // A modest geographic mesh corrects projective distortion under pitch and
  // Earth's curvature without evaluating the model during a camera gesture.
  const meshColumns = 12; const meshRows = 8;
  const mesh = Array.from({ length: (meshColumns + 1) * (meshRows + 1) }, (_, index) =>
    falloutTexturePoint(field, bounds, (index % (meshColumns + 1)) / meshColumns, Math.floor(index / (meshColumns + 1)) / meshRows));
  return { field, bounds, canvas, values, mesh, meshColumns, meshRows };
}
