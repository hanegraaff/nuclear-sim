/** Strike-local texture tests pin geographic equivalence, bounded caches, and extreme/world-wrap safety. */
import { describe, expect, it, vi } from "vitest";
import { modelFallout } from "../../src/domain/fallout";
import { MAX_SURFACE_DISTANCE_KM } from "../../src/domain/blast";
import { surfaceDistanceKm } from "../../src/domain/geodesy";
import { buildFalloutTexture, falloutTextureBounds, falloutTexturePoint, falloutTextureSize, FALLOUT_CACHE_TEXELS } from "../../src/rendering/effects/falloutTexture";
import { projectFalloutTexture } from "../../src/rendering/effects/projectFalloutTexture";

describe("camera-independent fallout textures", () => {
  it("allocates within a shared scene allowance and maps local samples across the antimeridian", () => {
    const field = modelFallout({ longitude: 179.98, latitude: 40 }, 0.021);
    const bounds = falloutTextureBounds(field);
    for (const count of [1, 10, 100, 1000]) {
      const budget = Math.floor(FALLOUT_CACHE_TEXELS / count);
      const size = falloutTextureSize(bounds, budget);
      expect(size.width * size.height * count).toBeLessThanOrEqual(FALLOUT_CACHE_TEXELS);
    }
    const corner = falloutTexturePoint(field, bounds, 1, 0);
    const distance = Math.hypot(bounds.eastKm, bounds.northKm);
    // The chart uses exact spherical forward/inverse distance; 1e-7 km
    // allows only floating arithmetic, including normalized longitudes.
    expect(surfaceDistanceKm(field.origin, corner)).toBeCloseTo(distance, 7);
    expect(corner.longitude).toBeLessThan(0);
  });

  it("does not fold samples beyond the antipodal disk back onto Earth for extreme yields", () => {
    const field = modelFallout({ longitude: -74, latitude: 40 }, 1e9);
    const context = { createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData: () => {} };
    const create = vi.spyOn(document, "createElement").mockImplementation(() => ({ width: 0, height: 0, getContext: () => context }) as unknown as HTMLCanvasElement);
    try {
      const texture = buildFalloutTexture(field, 1600);
      let outside = 0;
      for (let y = 0; y < texture.canvas.height; y++) for (let x = 0; x < texture.canvas.width; x++) {
        const east = texture.bounds.westKm + (texture.bounds.eastKm - texture.bounds.westKm) * x / (texture.canvas.width - 1);
        const north = texture.bounds.northKm - (texture.bounds.northKm - texture.bounds.southKm) * y / (texture.canvas.height - 1);
        if (Math.hypot(east, north) >= MAX_SURFACE_DISTANCE_KM) {
          expect(texture.values[y * texture.canvas.width + x]).toBe(0); outside++;
        }
      }
      expect(outside).toBeGreaterThan(0);
      expect(texture.mesh.every((point) => Number.isFinite(point.longitude) && Number.isFinite(point.latitude))).toBe(true);
      expect(texture.values.every((value) => value >= 0 && value <= 1)).toBe(true);
    } finally { create.mockRestore(); }
  });

  it("culls invalid horizon and wrap-discontinuous mesh faces rather than painting cross-map stripes", () => {
    const drawImage = vi.fn();
    const context = {
      save: () => {}, restore: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {}, clip: () => {}, transform: () => {}, drawImage,
    } as unknown as CanvasRenderingContext2D;
    const texture = {
      field: modelFallout({ longitude: 179, latitude: 40 }, 0.021),
      canvas: { width: 2, height: 2 }, meshColumns: 1, meshRows: 1,
      mesh: [{ longitude: 179, latitude: 40 }, { longitude: -179, latitude: 40 }, { longitude: 179, latitude: 39 }, { longitude: -179, latitude: 39 }],
    } as never;
    projectFalloutTexture(context, texture, { toScreen: () => ({ x: NaN, y: NaN }) }, 1000, 700);
    expect(drawImage).not.toHaveBeenCalled();
    projectFalloutTexture(context, texture, {
      toScreen: (point) => ({ x: point.longitude + 500, y: point.latitude }),
      snapshot: () => ({ center: { longitude: 0, latitude: 40 }, zoom: 1, pitch: 0, bearing: 0 }),
    }, 1000, 700);
    expect(drawImage).not.toHaveBeenCalled();
    projectFalloutTexture(context, texture, {
      toScreen: (point) => ({ x: (point.longitude < 0 ? point.longitude + 360 : point.longitude) + 300, y: point.latitude }),
      snapshot: () => ({ center: { longitude: 179, latitude: 40 }, zoom: 1, pitch: 0, bearing: 0 }),
    }, 1000, 700);
    expect(drawImage).toHaveBeenCalledTimes(2);
    drawImage.mockClear();
    projectFalloutTexture(context, texture, {
      // These valid geographic faces enclose the viewport at high zoom.
      // Clipping, rather than a screen-edge-size cutoff, keeps them visible.
      toScreen: (point) => ({ x: ((point.longitude < 0 ? point.longitude + 360 : point.longitude) - 180) * 5000 + 500, y: (point.latitude - 39.5) * 8000 + 350 }),
      snapshot: () => ({ center: { longitude: 179, latitude: 40 }, zoom: 18, pitch: 0, bearing: 0 }),
    }, 1000, 700);
    expect(drawImage).toHaveBeenCalledTimes(2);
  });
});
