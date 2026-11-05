import { surfaceDistanceKm, type GeoPoint } from "../../domain/geodesy";
import type { ScreenPoint } from "../map/MapCameraAdapter";

/** The camera operation needed to sample geography at a CSS-pixel position. */
export interface GroundUnprojector {
  toGeo(point: ScreenPoint): GeoPoint;
}

/** Geographic distance in km at each sample of a viewport-sized field mask. */
export interface BlastDistanceGrid {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly distancesKm: Float32Array;
}

/** Camera-ground sample coordinates in degrees, shared by every multi strike. */
export interface BlastGroundGrid {
  readonly width: number;
  readonly height: number;
  readonly longitudes: Float64Array;
  readonly latitudes: Float64Array;
  readonly center: GeoPoint | null;
  readonly farthestFromCenterKm: number;
}

/**
 * Unproject one bounded viewport mask for all overlapping strikes. Invalid
 * sky samples use NaN; a finite center and maximum center distance enable
 * conservative culling through the geodesic triangle inequality.
 */
export function buildBlastGroundGrid(
  camera: GroundUnprojector,
  viewportWidth: number,
  viewportHeight: number,
  sampleCap: { readonly width: number; readonly height: number },
): BlastGroundGrid {
  if (![viewportWidth, viewportHeight, sampleCap.width, sampleCap.height].every(Number.isFinite)
    || viewportWidth <= 0 || viewportHeight <= 0 || sampleCap.width <= 0 || sampleCap.height <= 0) {
    throw new RangeError("Blast ground sampling requires positive finite dimensions.");
  }
  const scale = Math.min(0.42, sampleCap.width / viewportWidth, sampleCap.height / viewportHeight);
  const width = Math.max(1, Math.ceil(viewportWidth * scale));
  const height = Math.max(1, Math.ceil(viewportHeight * scale));
  const longitudes = new Float64Array(width * height);
  const latitudes = new Float64Array(width * height);
  let center: GeoPoint | null = null;
  try {
    const projected = camera.toGeo({ x: viewportWidth / 2, y: viewportHeight / 2 });
    if (Number.isFinite(projected.longitude) && Number.isFinite(projected.latitude)) center = projected;
  }
  catch { /* A pitched sky center disables culling, not field sampling. */ }
  let farthestFromCenterKm = 0;
  for (let index = 0; index < longitudes.length; index += 1) {
    const x = index % width;
    const y = Math.floor(index / width);
    try {
      const ground = camera.toGeo({ x: (x + 0.5) / scale, y: (y + 0.5) / scale });
      if (!Number.isFinite(ground.longitude) || !Number.isFinite(ground.latitude)) throw new RangeError("Sky sample");
      longitudes[index] = ground.longitude;
      latitudes[index] = ground.latitude;
      if (center) farthestFromCenterKm = Math.max(farthestFromCenterKm, surfaceDistanceKm(center, ground));
    } catch {
      longitudes[index] = Number.NaN;
      latitudes[index] = Number.NaN;
    }
  }
  return { width, height, longitudes, latitudes, center, farthestFromCenterKm };
}

/**
 * Sample visible ground distance from an impact in kilometers. Each pixel is
 * unprojected through the current camera, so antimeridian crossings and large
 * effects use the geodesic model rather than a local screen-pixel scale.
 * Invalid sky/horizon samples are marked Infinity and remain transparent.
 */
export function buildBlastDistanceGrid(
  camera: GroundUnprojector,
  origin: GeoPoint,
  viewportWidth: number,
  viewportHeight: number,
  sampleCap: { readonly width: number; readonly height: number } = { width: 640, height: 420 },
): BlastDistanceGrid {
  if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) {
    throw new RangeError("Blast viewport must have positive finite CSS-pixel dimensions.");
  }
  // Match the prototype's bounded mask size; browser image smoothing hides the
  // subpixel mask resolution while geodesic distances remain authoritative.
  const scale = Math.min(0.42, sampleCap.width / viewportWidth, sampleCap.height / viewportHeight);
  const width = Math.max(1, Math.ceil(viewportWidth * scale));
  const height = Math.max(1, Math.ceil(viewportHeight * scale));
  const distancesKm = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      try {
        const ground = camera.toGeo({ x: (x + 0.5) / scale, y: (y + 0.5) / scale });
        const distance = surfaceDistanceKm(origin, ground);
        distancesKm[index] = Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY;
      } catch {
        distancesKm[index] = Number.POSITIVE_INFINITY;
      }
    }
  }
  return { width, height, scale, distancesKm };
}
