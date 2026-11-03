import type { GeoPoint } from "../../domain/geodesy";
import { blastExpansion } from "./blastTiming";

const EARTH_CIRCUMFERENCE_M = 40_075_016.68557849;

/** Optical growth, visibility, and cooling for one modeled fireball; all values are unit fractions. */
export interface FireballEnvelope {
  readonly radius: number;
  readonly opacity: number;
  readonly cooling: number;
}

/** Clamp a finite fraction into the visible range. */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Smooth an optical transition without changing its physical kilometer endpoint. */
function smoothstep(start: number, end: number, value: number): number {
  const fraction = clamp01((value - start) / (end - start));
  return fraction * fraction * (3 - 2 * fraction);
}

/**
 * Grow the dome to its modeled radius as the advancing blast front reaches the
 * fireball boundary. Inputs are normalized blast progress and radii in km.
 */
export function fireballEnvelope(progress: number, fireballKm: number, lightKm: number): FireballEnvelope {
  if (!Number.isFinite(progress) || !Number.isFinite(fireballKm) || fireballKm <= 0 || !Number.isFinite(lightKm) || lightKm <= 0) {
    return { radius: 0, opacity: 0, cooling: 0 };
  }
  const bounded = clamp01(progress);
  const frontKm = blastExpansion(bounded) * lightKm;
  const growth = clamp01(frontKm / fireballKm);
  return {
    radius: smoothstep(0, 1, growth),
    opacity: smoothstep(0, 0.14, growth),
    cooling: smoothstep(0.02, 0.42, bounded),
  };
}

/** Select a bounded hemisphere mesh from its projected radius in CSS pixels. */
export function fireballMeshDetail(pixelRadius: number): "compact" | "full" {
  return pixelRadius < 32 ? "compact" : "full";
}

/** Build a unit hemisphere with the z axis vertical and triangles facing outward. */
export function hemisphereVertices(rings: number, slices: number): Float32Array {
  if (!Number.isInteger(rings) || rings < 2 || !Number.isInteger(slices) || slices < 3) {
    throw new RangeError("Hemisphere detail requires at least two rings and three slices.");
  }
  const vertices = new Float32Array(rings * slices * 6 * 3);
  const point = (ring: number, slice: number): readonly [number, number, number] => {
    const polar = ring / rings * Math.PI / 2;
    const azimuth = slice / slices * Math.PI * 2;
    return [Math.sin(polar) * Math.cos(azimuth), Math.sin(polar) * Math.sin(azimuth), Math.cos(polar)];
  };
  let offset = 0;
  for (let ring = 0; ring < rings; ring++) for (let slice = 0; slice < slices; slice++) {
    for (const vertex of [point(ring, slice), point(ring + 1, slice), point(ring + 1, slice + 1), point(ring, slice), point(ring + 1, slice + 1), point(ring, slice + 1)]) {
      vertices.set(vertex, offset);
      offset += 3;
    }
  }
  return vertices;
}

/** Approximate ground meters per CSS pixel for Web Mercator at a map zoom. */
export function groundMetersPerPixel(latitudeDegrees: number, zoom: number): number {
  return EARTH_CIRCUMFERENCE_M * Math.max(0.04, Math.cos(latitudeDegrees * Math.PI / 180)) / (512 * 2 ** zoom);
}

/**
 * Transform a unit hemisphere into MapLibre world coordinates. The geographic
 * point is in degrees, the radius in km, and translation uses double precision
 * before the 32-bit GPU matrix is produced for high-zoom stability.
 */
export function localMercatorMatrix(cameraMatrix: ArrayLike<number>, point: GeoPoint, radiusKm: number, cameraLongitude: number): Float32Array {
  if (cameraMatrix.length !== 16 || !Number.isFinite(radiusKm) || radiusKm < 0) throw new RangeError("Invalid fireball transform.");
  const latitude = Math.max(-85, Math.min(85, point.latitude)) * Math.PI / 180;
  const longitude = point.longitude + Math.round((cameraLongitude - point.longitude) / 360) * 360;
  const x = (longitude + 180) / 360;
  const y = (1 - Math.log(Math.tan(Math.PI / 4 + latitude / 2)) / Math.PI) / 2;
  const scale = radiusKm * 1000 / (EARTH_CIRCUMFERENCE_M * Math.cos(latitude));
  const output = new Float32Array(16);
  for (let row = 0; row < 4; row++) {
    output[row] = cameraMatrix[row]! * scale;
    output[4 + row] = cameraMatrix[4 + row]! * scale;
    output[8 + row] = cameraMatrix[8 + row]! * scale;
    output[12 + row] = cameraMatrix[row]! * x + cameraMatrix[4 + row]! * y + cameraMatrix[12 + row]!;
  }
  return output;
}
