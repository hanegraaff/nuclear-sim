/** Geographic field-mask contracts use fake cameras and real great-circle distances, without tiles or Canvas. */
import { describe, expect, it } from "vitest";
import { blastRadiiForYield } from "../../src/domain/blast";
import { destinationPoint, geoPoint, surfaceDistanceKm, type GeoPoint } from "../../src/domain/geodesy";
import { buildBlastDistanceGrid, type GroundUnprojector } from "../../src/rendering/effects/blastFieldGeometry";

/** Return the sampled km value nearest a CSS-pixel position. Float32 storage allows 0.01 km tolerance. */
function distanceAt(grid: ReturnType<typeof buildBlastDistanceGrid>, cssX: number, cssY: number): number {
  const x = Math.min(grid.width - 1, Math.max(0, Math.floor(cssX * grid.scale)));
  const y = Math.min(grid.height - 1, Math.max(0, Math.floor(cssY * grid.scale)));
  return grid.distancesKm[y * grid.width + x]!;
}

/** Fake unprojection maps CSS pixels to kilometer offsets along a true geodesic. */
function kilometerCamera(origin: GeoPoint, kmPerPixel: number): GroundUnprojector {
  return { toGeo: ({ x }) => destinationPoint(origin, Math.abs(x - 50) * kmPerPixel, x >= 50 ? 90 : 270) };
}

describe("geographically sampled blast field", () => {
  it("uses the camera's current scale and rebuilds the visible distances after zoom", () => {
    const origin = geoPoint(-73.9, 40.7);
    const near = buildBlastDistanceGrid(kilometerCamera(origin, 2), origin, 100, 100);
    const far = buildBlastDistanceGrid(kilometerCamera(origin, 4), origin, 100, 100);
    const atNearZoom = distanceAt(near, 75, 50);
    const atFarZoom = distanceAt(far, 75, 50);
    // One sample spans about 2.4 CSS px; 6 km accommodates that quantization.
    expect(Math.abs(atFarZoom - atNearZoom * 2)).toBeLessThan(6);
    expect(atFarZoom).toBeGreaterThan(atNearZoom + 40);
  });

  it("samples antimeridian and high-latitude ground without a longitude seam", () => {
    const origin = geoPoint(179.9, 75);
    const camera: GroundUnprojector = { toGeo: ({ x, y }) => geoPoint(179.9 + (x - 50) * 0.02, 75 + (y - 50) * 0.005) };
    const grid = buildBlastDistanceGrid(camera, origin, 100, 100);
    const point = { x: (26 + 0.5) / grid.scale, y: (21 + 0.5) / grid.scale };
    const expected = surfaceDistanceKm(origin, camera.toGeo(point));
    expect(Math.abs(grid.distancesKm[21 * grid.width + 26]! - expected)).toBeLessThan(0.01);
    expect(distanceAt(grid, 55, 50)).toBeLessThan(distanceAt(grid, 90, 50));
  });

  it("keeps a large-yield field bounded by modeled kilometers rather than viewport pixels", () => {
    const origin = geoPoint(0, 0);
    const radii = blastRadiiForYield(1000);
    const grid = buildBlastDistanceGrid(kilometerCamera(origin, 20), origin, 100, 100);
    expect(distanceAt(grid, 55, 50)).toBeLessThan(radii.light);
    expect(distanceAt(grid, 80, 50)).toBeGreaterThan(radii.light);
  });

  it("treats unprojectable horizon samples as transparent", () => {
    const origin = geoPoint(0, 0);
    const camera: GroundUnprojector = { toGeo: () => { throw new RangeError("sky"); } };
    const grid = buildBlastDistanceGrid(camera, origin, 100, 100);
    expect(grid.distancesKm.every((distance) => distance === Number.POSITIVE_INFINITY)).toBe(true);
  });
});
