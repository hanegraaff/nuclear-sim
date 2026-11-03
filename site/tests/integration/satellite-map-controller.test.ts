/** Map lifecycle tests exercise source-specific failures without a browser or live tiles. */
import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { SatelliteMapController, scenarioZoom, type MapLoadState } from "../../src/rendering/map/SatelliteMapController";

function fakeMap() {
  const listeners = new Map<string, Set<(event?: never) => void>>();
  const refreshTiles = vi.fn();
  const setStyle = vi.fn();
  const setPadding = vi.fn();
  const remove = vi.fn();
  const stop = vi.fn();
  const easeTo = vi.fn();
  let center = { lng: -73.9857, lat: 40.7484 };
  let viewportWidth = 2208;
  let sourceLoaded = true;
  return {
    map: {
      on: (name: string, listener: (event?: never) => void) => {
        const callbacks = listeners.get(name) ?? new Set();
        callbacks.add(listener);
        listeners.set(name, callbacks);
      },
      off: (name: string, listener: (event?: never) => void) => listeners.get(name)?.delete(listener),
      getCenter: () => center,
      getZoom: () => 10.6,
      getPitch: () => 0,
      getBearing: () => 0,
      project: ([lng, lat]: [number, number]) => ({ x: lng * 10 + 1200, y: lat * -10 + 800 }),
      unproject: ([x, y]: [number, number]) => ({ lng: (x - 1200) / 10, lat: (800 - y) / 10 }),
      getContainer: () => ({ clientWidth: viewportWidth, clientHeight: 740 }),
      setPadding,
      isSourceLoaded: () => sourceLoaded,
      refreshTiles,
      setStyle,
      remove,
      stop,
      easeTo,
    } as unknown as MapLibreMap,
    emit: (name: string, event?: object) => listeners.get(name)?.forEach((listener) => listener(event as never)),
    setCenter: (lng: number, lat: number) => { center = { lng, lat }; },
    setViewportWidth: (width: number) => { viewportWidth = width; },
    setSourceLoaded: (loaded: boolean) => { sourceLoaded = loaded; },
    refreshTiles,
    setStyle,
    setPadding,
    remove,
    stop,
    easeTo,
  };
}

describe("satellite map controller", () => {
  it("turns a bare map click into one geographic route and ignores a control click", () => {
    const runtime = fakeMap();
    const launches: unknown[] = [];
    const controller = new SatelliteMapController(runtime.map, {
      onStateChange: () => {}, onCameraChange: () => {}, onLaunch: (route) => launches.push(route), launchAngle: () => Math.PI,
    });
    runtime.emit("click", { point: { x: 900, y: 450 }, originalEvent: { target: {} } });
    expect(launches).toHaveLength(1);
    expect(launches[0]).toMatchObject({ target: { longitude: -30, latitude: 35 } });
    expect((launches[0] as { start: { longitude: number } }).start.longitude).toBeLessThan(-30);
    controller.dispose();
  });
  it("keeps scenario imagery loading until the destination source is idle and loaded", () => {
    const runtime = fakeMap();
    const states: MapLoadState[] = [];
    const controller = new SatelliteMapController(runtime.map, { onStateChange: (state) => states.push(state), onCameraChange: () => {} });
    runtime.emit("load");
    runtime.emit("idle");
    runtime.setSourceLoaded(false);
    controller.focusScenario({ center: { longitude: 132.4547, latitude: 34.3947 }, horizonKm: 5.934 });
    runtime.emit("idle");
    expect(states).toEqual(["ready", "loading"]);
    runtime.setSourceLoaded(true);
    runtime.emit("idle");
    expect(states).toEqual(["ready", "loading", "ready"]);
    controller.dispose();
  });
  it("stops a previous movement and eases to the scenario at a scale-dependent zoom", () => {
    const runtime = fakeMap();
    const controller = new SatelliteMapController(runtime.map, { onStateChange: () => {}, onCameraChange: () => {} });
    controller.focusScenario({ center: { longitude: 132.4547, latitude: 34.3947 }, horizonKm: 5.934 });
    expect(runtime.stop).toHaveBeenCalledOnce();
    expect(runtime.easeTo).toHaveBeenCalledWith({ center: [132.4547, 34.3947], zoom: scenarioZoom(5.934, 34.3947, 2208, 740), duration: 650 });
    expect(scenarioZoom(1000, 34, 2208, 740)).toBeLessThan(scenarioZoom(5, 34, 2208, 740));
    expect(scenarioZoom(1e9, 0, 2208, 740)).toBe(0.75);
    expect(scenarioZoom(0.001, 0, 2208, 740)).toBe(13);
    controller.dispose();
  });
  it("reports camera movement and ignores unrelated errors after load", () => {
    const runtime = fakeMap();
    const states: MapLoadState[] = [];
    const cameras: Array<{ longitude: number; latitude: number; zoom: number; pitch: number; bearing: number }> = [];
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const controller = new SatelliteMapController(runtime.map, {
        onStateChange: (state) => states.push(state),
        onCameraChange: (camera) => cameras.push(camera),
      });
      runtime.emit("load");
      runtime.emit("sourcedata", { sourceId: "satellite", tile: { state: "loaded" } });
      expect(states).toEqual([]);
      runtime.emit("idle");
      runtime.emit("error", { error: new Error("overlay failed"), sourceId: "future-effect" });
      runtime.setCenter(-74, 41);
      runtime.emit("moveend");
      expect(states).toEqual(["ready"]);
      expect(cameras.at(-1)).toEqual({ longitude: -74, latitude: 41, zoom: 10.6, pitch: 0, bearing: 0 });
      expect(runtime.setPadding).toHaveBeenCalledWith({ top: 0, right: 0, bottom: 0, left: 380 });
      runtime.setViewportWidth(800);
      runtime.emit("resize");
      expect(runtime.setPadding).toHaveBeenLastCalledWith({ top: 80, right: 0, bottom: 0, left: 0 });
      controller.setPanelsVisible(false);
      expect(runtime.setPadding).toHaveBeenLastCalledWith({ top: 0, right: 0, bottom: 0, left: 0 });
      controller.dispose();
      expect(runtime.remove).toHaveBeenCalledOnce();
    } finally {
      log.mockRestore();
    }
  });

  it("clears a transient imagery error and retries tiles without replacing the style", () => {
    const runtime = fakeMap();
    const states: MapLoadState[] = [];
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const controller = new SatelliteMapController(runtime.map, {
        onStateChange: (state) => states.push(state),
        onCameraChange: () => {},
      });
      runtime.emit("load");
      runtime.emit("idle");
      runtime.emit("error", { error: new Error("tile failed"), sourceId: "satellite" });
      runtime.emit("sourcedata", { sourceId: "satellite", tile: { state: "loaded" } });
      runtime.emit("idle");
      expect(states).toEqual(["ready", "imagery-error", "loading", "ready"]);

      controller.retryImagery();
      expect(runtime.refreshTiles).toHaveBeenCalledWith("satellite");
      expect(runtime.setStyle).not.toHaveBeenCalled();
      runtime.emit("sourcedata", { sourceId: "satellite", tile: { state: "loaded" } });
      runtime.emit("idle");
      expect(states.at(-1)).toBe("ready");

      runtime.refreshTiles.mockImplementationOnce(() => { throw new Error("retry unavailable"); });
      controller.retryImagery();
      expect(states.slice(-2)).toEqual(["loading", "imagery-error"]);
      controller.dispose();
    } finally {
      log.mockRestore();
    }
  });

  it("reports a map startup failure separately from imagery failure", () => {
    const runtime = fakeMap();
    const states: MapLoadState[] = [];
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const controller = new SatelliteMapController(runtime.map, {
        onStateChange: (state) => states.push(state),
        onCameraChange: () => {},
      });
      runtime.emit("error", { error: new Error("WebGL unavailable") });
      expect(states).toEqual(["map-error"]);
      controller.dispose();
    } finally {
      log.mockRestore();
    }
  });
});
