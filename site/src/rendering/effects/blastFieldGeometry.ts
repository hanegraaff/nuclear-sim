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
): BlastDistanceGrid {
  if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) {
    throw new RangeError("Blast viewport must have positive finite CSS-pixel dimensions.");
  }
  // Match the prototype's bounded mask size; browser image smoothing hides the
  // subpixel mask resolution while geodesic distances remain authoritative.
  const scale = Math.min(0.42, 640 / viewportWidth, 420 / viewportHeight);
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
