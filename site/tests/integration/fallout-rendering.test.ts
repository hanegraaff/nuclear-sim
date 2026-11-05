/** Fallout projection and cache contracts use deterministic geography and fake canvases, without map tiles. */
import { describe, expect, it, vi } from "vitest";
import { blastRadiiForYield } from "../../src/domain/blast";
import { modelFallout } from "../../src/domain/fallout";
import { normalizeLongitude, type GeoPoint } from "../../src/domain/geodesy";
import type { LaunchFrame } from "../../src/application/launch";
import { FalloutCanvasRenderer } from "../../src/rendering/effects/FalloutCanvasRenderer";
import { buildFalloutInspection } from "../../src/rendering/overlays/falloutInspection";

/** Local fake camera keeps antimeridian wrapping explicit; scale is CSS pixels/km. */
function cameraAt(origin: GeoPoint, scale: number, x: number, y: number) {
  const longitudeKm = 111.195 * Math.cos(origin.latitude * Math.PI / 180);
  return {
    toScreen: (point: GeoPoint) => ({
      x: x + normalizeLongitude(point.longitude - origin.longitude) * longitudeKm * scale,
      y: y - (point.latitude - origin.latitude) * 111.195 * scale,
    }),
    toGeo: vi.fn((point: { x: number; y: number }) => ({
      longitude: normalizeLongitude(origin.longitude + (point.x - x) / (longitudeKm * scale)),
      latitude: origin.latitude - (point.y - y) / (111.195 * scale),
    })),
  };
}

describe("Fallout ground projection", () => {
  it("pans and zooms all four marker positions with the same geographic ruler", () => {
    const origin = { longitude: -73.9857, latitude: 40.7484 };
    const field = modelFallout(origin, 0.021);
    const first = buildFalloutInspection(cameraAt(origin, 12, 400, 500), field, 1500, 1000)!;
    const moved = buildFalloutInspection(cameraAt(origin, 24, 500, 540), field, 1500, 1000)!;
    expect(first.ruler).toHaveLength(43);
    expect(first.zones).toHaveLength(4);
    first.zones.forEach(({ marker }, index) => {
      const projected = moved.zones[index]!.marker;
      // Both adapters use the same local projection, so floating arithmetic alone sets this tolerance.
      expect(projected.x).toBeCloseTo(500 + (marker.x - 400) * 2, 8);
      expect(projected.y).toBeCloseTo(540 + (marker.y - 500) * 2, 8);
    });
  });

  it("keeps an eastward plume continuous across the antimeridian and rejects invalid sky projections", () => {
    const origin = { longitude: 179.98, latitude: 40 };
    const field = modelFallout(origin, 0.021);
    const geometry = buildFalloutInspection(cameraAt(origin, 12, 400, 500), field, 1500, 1000)!;
    expect(geometry.ruler.every((point) => point.x >= 400 && point.x < 1200)).toBe(true);
    expect(geometry.zones.every((zone) => zone.visible)).toBe(true);
    expect(buildFalloutInspection({ toScreen: () => ({ x: NaN, y: NaN }) }, field, 1500, 1000)).toBeNull();
  });

  it("reuses geographic samples, rebuilds them after camera/resize changes, and cancels obsolete continuations", () => {
    const origin = { longitude: -73.9857, latitude: 40.7484 };
    const camera = cameraAt(origin, 10, 50, 50);
    const translate = vi.fn();
    const context = {
      setTransform: () => {}, clearRect: () => {}, save: () => {}, restore: () => {}, drawImage: () => {},
      createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {},
      setLineDash: () => {}, arc: () => {}, fill: () => {}, measureText: () => ({ width: 100 }),
      fillRect: () => {}, fillText: () => {},
      translate, scale: () => {}, createRadialGradient: () => ({ addColorStop: () => {} }),
    };
    const canvas = () => ({ width: 0, height: 0, getContext: () => context }) as unknown as HTMLCanvasElement;
    const createElement = vi.spyOn(document, "createElement").mockReturnValue(canvas());
    const requestFrame = vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(7);
    const cancelFrame = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
    const frames: LaunchFrame[] = [{
      launch: {
        id: 1, deviceId: "fat-man", yieldMt: 0.021,
        route: { start: origin, control: origin, target: origin }, launchedAtMs: 0,
        flightMs: 6500, blastMs: 4600, radii: blastRadiiForYield(0.021), fallout: modelFallout(origin, 0.021),
      }, elapsedMs: 11_100,
    }];
    try {
      const renderer = new FalloutCanvasRenderer(canvas(), camera as never, canvas());
      renderer.render(frames, 100, 100, false, null);
      expect(translate).toHaveBeenCalledWith(50, 50);
      const firstGridCalls = camera.toGeo.mock.calls.length;
      renderer.render(frames, 100, 100, false, "high");
      expect(camera.toGeo).toHaveBeenCalledTimes(firstGridCalls);
      renderer.invalidateProjection();
      renderer.render(frames, 100, 100, false, null);
      expect(camera.toGeo.mock.calls.length).toBeGreaterThan(firstGridCalls);
      const afterCamera = camera.toGeo.mock.calls.length;
      renderer.render(frames, 800, 700, false, null);
      expect(camera.toGeo.mock.calls.length).toBeGreaterThan(afterCamera);
      expect(requestFrame).toHaveBeenCalled();
      renderer.dispose();
      expect(cancelFrame).toHaveBeenCalledWith(7);
      expect(renderer.render([], 800, 700, false, null)).toBeNull();
    } finally {
      createElement.mockRestore(); requestFrame.mockRestore(); cancelFrame.mockRestore();
    }
  });
});
