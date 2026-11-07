/** Fake MapLibre frames verify the 3D overlay follows the immutable strike and fails without hiding Canvas 2D. */
import { describe, expect, it, vi } from "vitest";
import type { CustomLayerInterface, Map as MapLibreMap } from "maplibre-gl";
import type { Launch } from "../../src/application/launch";
import { blastRadiiForYield } from "../../src/domain/blast";
import { geoPoint } from "../../src/domain/geodesy";
import type { FireballRenderer } from "../../src/rendering/animation/FireballRenderer";
import type { BlastCanvasRenderer } from "../../src/rendering/effects/BlastCanvasRenderer";
import { SatelliteMapController } from "../../src/rendering/map/SatelliteMapController";

const MATRIX = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const TARGET = geoPoint(-73.9857, 40.7484);

/** Stable 21 kt launch fixture; only timing and target are inspected here. */
function launch(id: number): Launch {
  return {
    id, deviceId: "fat-man", yieldMt: 0.021,
    route: { start: geoPoint(-75, 41), control: geoPoint(-74, 41), target: TARGET },
    launchedAtMs: 0, flightMs: 6500, blastMs: 4600, radii: blastRadiiForYield(0.021),
  };
}

/** Minimal event source and camera; no map tiles or browser timing are used. */
function fakeMap(addLayerFailure = false) {
  const listeners = new Map<string, Set<() => void>>();
  const layers: CustomLayerInterface[] = [];
  const triggerRepaint = vi.fn();
  const resize = vi.fn();
  let center = { lng: TARGET.longitude, lat: TARGET.latitude };
  let zoom = 11.6;
  const addLayer = vi.fn((layer: CustomLayerInterface) => {
    if (addLayerFailure) throw new Error("custom layers unavailable");
    layers.push(layer);
  });
  const map = {
    on: (event: string, callback: () => void) => { const group = listeners.get(event) ?? new Set(); group.add(callback); listeners.set(event, group); },
    off: (event: string, callback: () => void) => listeners.get(event)?.delete(callback),
    getCenter: () => center,
    getZoom: () => zoom,
    getPitch: () => 60,
    getBearing: () => 0,
    getContainer: () => ({ clientWidth: 1508, clientHeight: 1080 }),
    setPadding: vi.fn(),
    setPaintProperty: vi.fn(),
    addLayer,
    triggerRepaint,
    resize,
    remove: vi.fn(),
  } as unknown as MapLibreMap;
  return { map, layers, addLayer, triggerRepaint, resize,
    setCamera: (longitude: number, nextZoom: number) => { center = { lng: longitude, lat: TARGET.latitude }; zoom = nextZoom; },
    emit: (event: string) => listeners.get(event)?.forEach((callback) => callback()) };
}

describe("MapLibre fireball camera layer", () => {
  it("discards a stale matrix while hidden and redraws with fresh camera data on visibility and focus return", () => {
    const runtime = fakeMap();
    const render = vi.fn();
    const clear = vi.fn();
    const fireball = { render, clear, dispose: vi.fn() } as unknown as FireballRenderer;
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    try {
      const controller = new SatelliteMapController(runtime.map, { onStateChange: () => {}, onCameraChange: () => {} }, undefined, undefined, fireball);
      runtime.emit("load");
      controller.setFlightFrame(launch(1), 11_100);
      runtime.layers[0]!.render({} as WebGL2RenderingContext, { defaultProjectionData: { mainMatrix: MATRIX } } as never);
      expect(render).toHaveBeenCalledTimes(1);

      hidden.mockReturnValue(true);
      document.dispatchEvent(new Event("visibilitychange"));
      expect(clear).toHaveBeenCalledOnce();
      runtime.setCamera(-74.4, 12.6);
      runtime.emit("move");
      controller.setFlightFrame(launch(1), 11_100);
      expect(render).toHaveBeenCalledTimes(1);

      hidden.mockReturnValue(false);
      document.dispatchEvent(new Event("visibilitychange"));
      expect(runtime.resize).toHaveBeenCalledOnce();
      const restoredMatrix = new Float32Array(MATRIX);
      restoredMatrix[12] = 0.25;
      runtime.layers[0]!.render({} as WebGL2RenderingContext, { defaultProjectionData: { mainMatrix: restoredMatrix } } as never);
      expect(Array.from(render.mock.lastCall![0] as Float64Array)).toEqual(Array.from(restoredMatrix));
      expect(render.mock.lastCall![1]).toEqual({ longitude: -74.4, zoom: 12.6 });

      runtime.setCamera(-75.2, 13.6);
      runtime.emit("move");
      window.dispatchEvent(new Event("focus"));
      expect(runtime.resize).toHaveBeenCalledTimes(2);
      const focusedMatrix = new Float32Array(MATRIX);
      focusedMatrix[13] = -0.35;
      runtime.layers[0]!.render({} as WebGL2RenderingContext, { defaultProjectionData: { mainMatrix: focusedMatrix } } as never);
      expect(Array.from(render.mock.lastCall![0] as Float64Array)).toEqual(Array.from(focusedMatrix));
      expect(render.mock.lastCall![1]).toEqual({ longitude: -75.2, zoom: 13.6 });
      controller.dispose();
      window.dispatchEvent(new Event("focus"));
      expect(runtime.resize).toHaveBeenCalledTimes(2);
    } finally {
      hidden.mockRestore();
    }
  });

  it("projects each frame from the same launch clock and clears on replacement and Reset", () => {
    const runtime = fakeMap();
    const render = vi.fn();
    const clear = vi.fn();
    const dispose = vi.fn();
    const fireball = { render, clear, dispose } as unknown as FireballRenderer;
    const controller = new SatelliteMapController(runtime.map, { onStateChange: () => {}, onCameraChange: () => {} }, undefined, undefined, fireball);
    runtime.emit("load");
    expect(runtime.layers).toHaveLength(1);
    expect(runtime.layers[0]).toMatchObject({ id: "fireball-camera", type: "custom" });
    controller.setFlightFrame(launch(1), 7200);
    expect(runtime.triggerRepaint).toHaveBeenCalled();
    runtime.layers[0]!.render({} as WebGL2RenderingContext, { defaultProjectionData: { mainMatrix: MATRIX } } as never);
    expect(render).toHaveBeenCalledWith(expect.any(Float64Array), { longitude: TARGET.longitude, zoom: 11.6 }, expect.objectContaining({ id: 1 }), 7200, 1508, 1080);
    expect(Array.from(render.mock.lastCall![0] as Float64Array)).toEqual(Array.from(MATRIX));
    controller.setFlightFrame(launch(2), 0);
    expect(clear).toHaveBeenCalledTimes(1);
    controller.setFlightFrame(null, 0);
    expect(clear).toHaveBeenCalledTimes(2);
    controller.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("keeps the 2D blast renderer active when optional WebGL setup is unavailable", () => {
    const runtime = fakeMap();
    const render = vi.fn(() => null);
    const blast = { render, invalidateProjection: vi.fn() } as unknown as BlastCanvasRenderer;
    const controller = new SatelliteMapController(runtime.map, { onStateChange: () => {}, onCameraChange: () => {} }, undefined, blast, null);
    runtime.emit("load");
    controller.setFlightFrame(launch(1), 7200);
    expect(runtime.addLayer).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 7200, 1508, 1080, null);
    controller.dispose();
  });

  it("warns once and keeps map interaction alive if a custom layer cannot be added", () => {
    const runtime = fakeMap(true);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const render = vi.fn();
    const fireball = { render, clear: vi.fn(), dispose: vi.fn() } as unknown as FireballRenderer;
    try {
      const controller = new SatelliteMapController(runtime.map, { onStateChange: () => {}, onCameraChange: () => {} }, undefined, undefined, fireball);
      runtime.emit("load");
      controller.setFlightFrame(launch(1), 7200);
      expect(runtime.triggerRepaint).not.toHaveBeenCalled();
      expect(warning).toHaveBeenCalledOnce();
      expect(render).not.toHaveBeenCalled();
      controller.dispose();
    } finally {
      warning.mockRestore();
    }
  });
});
