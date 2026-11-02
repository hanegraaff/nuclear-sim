/** Map lifecycle tests exercise source-specific failures without a browser or live tiles. */
import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { SatelliteMapController, type MapLoadState } from "../../src/rendering/map/SatelliteMapController";

function fakeMap() {
  const listeners = new Map<string, (event?: never) => void>();
  const refreshTiles = vi.fn();
  const setStyle = vi.fn();
  const setPadding = vi.fn();
  const remove = vi.fn();
  let center = { lng: -73.9857, lat: 40.7484 };
  let viewportWidth = 2208;
  return {
    map: {
      on: (name: string, listener: (event?: never) => void) => listeners.set(name, listener),
      off: (name: string) => listeners.delete(name),
      getCenter: () => center,
      getZoom: () => 10.6,
      getContainer: () => ({ clientWidth: viewportWidth }),
      setPadding,
      isSourceLoaded: () => true,
      refreshTiles,
      setStyle,
      remove,
    } as unknown as MapLibreMap,
    emit: (name: string, event?: object) => listeners.get(name)?.(event as never),
    setCenter: (lng: number, lat: number) => { center = { lng, lat }; },
    setViewportWidth: (width: number) => { viewportWidth = width; },
    refreshTiles,
    setStyle,
    setPadding,
    remove,
  };
}

describe("satellite map controller", () => {
  it("reports camera movement and ignores unrelated errors after load", () => {
    const runtime = fakeMap();
    const states: MapLoadState[] = [];
    const cameras: Array<{ longitude: number; latitude: number; zoom: number }> = [];
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
      expect(cameras.at(-1)).toEqual({ longitude: -74, latitude: 41, zoom: 10.6 });
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
