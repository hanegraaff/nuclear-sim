/** Map lifecycle tests exercise source-specific failures without a browser or live tiles. */
import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { SatelliteMapController, scenarioZoom, type MapLoadState } from "../../src/rendering/map/SatelliteMapController";
import type { MissileCanvasRenderer } from "../../src/rendering/animation/MissileCanvasRenderer";
import type { BlastCanvasRenderer } from "../../src/rendering/effects/BlastCanvasRenderer";
import type { MultiBlastCanvasRenderer } from "../../src/rendering/effects/MultiBlastCanvasRenderer";
import type { AudibleCanvasRenderer } from "../../src/rendering/effects/AudibleCanvasRenderer";
import type { Launch } from "../../src/application/launch";
import { blastRadiiForYield } from "../../src/domain/blast";
import { INITIAL_SIMULATOR_STATE, launchFramesForState, reduceSimulator } from "../../src/application/launch";

function fakeMap() {
  const listeners = new Map<string, Set<(event?: never) => void>>();
  const refreshTiles = vi.fn();
  const setStyle = vi.fn();
  const setPadding = vi.fn();
  const remove = vi.fn();
  const stop = vi.fn();
  const easeTo = vi.fn();
  const fitBounds = vi.fn();
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
      fitBounds,
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
    fitBounds,
  };
}

describe("satellite map controller", () => {
  it("paints an Audible preview before starting its first camera ease", () => {
    const runtime = fakeMap();
    const render = vi.fn().mockReturnValue(null);
    const primeFirstEntry = vi.fn();
    const audible = { render, primeFirstEntry, invalidateProjection: vi.fn(), settleProjection: vi.fn(), dispose: vi.fn() } as unknown as AudibleCanvasRenderer;
    const controller = new SatelliteMapController(runtime.map,
      { onStateChange: () => {}, onCameraChange: () => {} },
      undefined, undefined, null, undefined, undefined, audible);
    const origin = { longitude: -73.9857, latitude: 40.7484 };
    const launched = reduceSimulator(INITIAL_SIMULATOR_STATE, {
      type: "launchAt", route: { start: origin, control: origin, target: origin },
      deviceId: "fat-man", yieldMt: 0.021, nowMs: 0,
    });
    controller.setSceneFrame(launchFramesForState(launched), false, null, "audible");
    expect(runtime.easeTo).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledTimes(2);
    expect(primeFirstEntry).toHaveBeenCalledOnce();
    expect(primeFirstEntry.mock.invocationCallOrder[0]).toBeLessThan(runtime.easeTo.mock.invocationCallOrder[0]!);
    expect(render.mock.invocationCallOrder[0]).toBeLessThan(runtime.easeTo.mock.invocationCallOrder[0]!);
    controller.dispose();
  });

  it("reprojects Audible during move and starts one settled or resized camera rebuild", () => {
    const runtime = fakeMap();
    const render = vi.fn().mockReturnValue(null);
    const invalidateProjection = vi.fn();
    const settleProjection = vi.fn();
    const audible = { render, invalidateProjection, settleProjection, dispose: vi.fn() } as unknown as AudibleCanvasRenderer;
    const controller = new SatelliteMapController(runtime.map,
      { onStateChange: () => {}, onCameraChange: () => {} },
      undefined, undefined, null, undefined, undefined, audible);
    controller.setSceneFrame([], true, null, "audible");
    const initialPaints = render.mock.calls.length;
    runtime.emit("move");
    expect(invalidateProjection).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledTimes(initialPaints + 1);
    expect(settleProjection).not.toHaveBeenCalled();
    runtime.emit("moveend");
    expect(settleProjection).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledTimes(initialPaints + 2);
    runtime.emit("resize");
    expect(invalidateProjection).toHaveBeenCalledTimes(2);
    expect(settleProjection).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it("preserves a multi scene camera across views while single Fallout framing remains reversible", () => {
    const runtime = fakeMap();
    const controller = new SatelliteMapController(runtime.map, { onStateChange: () => {}, onCameraChange: () => {} });
    const origin = { longitude: -73.9857, latitude: 40.7484 };
    const launched = reduceSimulator(INITIAL_SIMULATOR_STATE, {
      type: "launchAt", route: { start: origin, control: origin, target: origin },
      deviceId: "fat-man", yieldMt: 0.021, nowMs: 0,
    });
    const settled = reduceSimulator(launched, { type: "tick", launchId: launched.launch!.id, nowMs: 12_000 });
    const frames = launchFramesForState(settled);
    controller.setSceneFrame(frames, true, null, "fallout");
    controller.setSceneFrame(frames, true, null, "blast");
    expect(runtime.easeTo).not.toHaveBeenCalled();
    controller.setSceneFrame(frames, false, null, "fallout");
    expect(runtime.easeTo).toHaveBeenCalledOnce();
    controller.setSceneFrame(frames, false, null, "blast");
    expect(runtime.easeTo).toHaveBeenLastCalledWith({
      // Longitude normalization can introduce only floating-point rounding in degrees.
      center: [expect.closeTo(origin.longitude, 10), origin.latitude], zoom: 10.6, pitch: 0, bearing: 0, duration: 650,
    });
    controller.dispose();
  });

  it("keeps a replacement launch camera while retaining explicit Blast-tab camera restoration", () => {
    const runtime = fakeMap();
    const controller = new SatelliteMapController(runtime.map, { onStateChange: () => {}, onCameraChange: () => {} });
    const origin = { longitude: -73.9857, latitude: 40.7484 };
    const launched = reduceSimulator(INITIAL_SIMULATOR_STATE, {
      type: "launchAt", route: { start: origin, control: origin, target: origin }, deviceId: "fat-man", yieldMt: 0.021, nowMs: 0,
    });
    const settled = reduceSimulator(launched, { type: "tick", launchId: launched.launch!.id, nowMs: 12_000 });
    controller.setSceneFrame(launchFramesForState(settled), false, null, "blast");
    controller.setSceneFrame(launchFramesForState(settled), false, null, "fallout");
    runtime.easeTo.mockClear();
    const target = { longitude: -73.55, latitude: 40.7 };
    const replacement = reduceSimulator(settled, { type: "launchAt", route: { start: origin, control: origin, target }, deviceId: "fat-man", yieldMt: 0.021, nowMs: 13_000 });
    controller.setSceneFrame(launchFramesForState(replacement), false, null, "blast");
    expect(runtime.easeTo).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("frames a hidden narrow MIRV group once without changing its geographic targets", () => {
    const runtime = fakeMap();
    runtime.setViewportWidth(430);
    const controller = new SatelliteMapController(runtime.map,
      { onStateChange: () => {}, onCameraChange: () => {}, clearMapTopPx: () => 420 });
    const route = { start: { longitude: -74.2, latitude: 40.9 }, control: { longitude: -74.1, latitude: 40.8 }, target: { longitude: -73.9857, latitude: 40.7484 } };
    const launched = reduceSimulator(INITIAL_SIMULATOR_STATE,
      { type: "launchAt", route, deviceId: "rs-24-yars", yieldMt: 0.525, nowMs: 0 });
    const frames = launchFramesForState(launched);
    const targets = frames.map((frame) => frame.launch.route.target);
    controller.setSceneFrame(frames, false);
    expect(runtime.fitBounds).toHaveBeenCalledOnce();
    expect(runtime.fitBounds).toHaveBeenCalledWith(expect.any(Array), {
      padding: { top: 420, right: 24, bottom: 75, left: 24 }, maxZoom: 10.6, duration: 650,
    });
    controller.setSceneFrame(frames, false);
    expect(runtime.fitBounds).toHaveBeenCalledOnce();
    expect(frames.map((frame) => frame.launch.route.target)).toEqual(targets);
    runtime.setViewportWidth(2208);
    const desktop = reduceSimulator(launched,
      { type: "launchAt", route, deviceId: "rs-24-yars", yieldMt: 0.525, nowMs: 1_000 });
    controller.setSceneFrame(launchFramesForState(desktop), false);
    expect(runtime.fitBounds).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it("renders every delivery of the newest whole group after multi mode is disabled", () => {
    const runtime = fakeMap();
    const singleRender = vi.fn().mockReturnValue(null);
    const inspectionOnly = vi.fn().mockReturnValue(null);
    const multiRender = vi.fn();
    const missileMany = vi.fn();
    const controller = new SatelliteMapController(runtime.map, { onStateChange: () => {}, onCameraChange: () => {} },
      { render: vi.fn(), renderMany: missileMany } as unknown as MissileCanvasRenderer,
      { render: singleRender, renderInspectionOnly: inspectionOnly } as unknown as BlastCanvasRenderer,
      null,
      { render: multiRender, dispose: vi.fn() } as unknown as MultiBlastCanvasRenderer);
    const route = { start: { longitude: -74, latitude: 41 }, control: { longitude: -73.9, latitude: 40.9 }, target: { longitude: -73.8, latitude: 40.8 } };
    const first: Launch = { id: 2, deviceId: "fat-man", yieldMt: 0.021, route, launchedAtMs: 0, flightMs: 6500, blastMs: 4600, radii: blastRadiiForYield(0.021) };
    const second: Launch = { ...first, id: 3, route: { ...route, target: { longitude: -73.7, latitude: 40.75 } } };
    const wholeGroup = [{ launch: first, elapsedMs: 11_100 }, { launch: second, elapsedMs: 11_100 }];
    controller.setSceneFrame(wholeGroup, false);
    expect(multiRender).toHaveBeenCalledWith(wholeGroup, 2208, 740, false);
    expect(missileMany).toHaveBeenCalledWith(wholeGroup, 2208, 740);
    expect(inspectionOnly).toHaveBeenCalledWith(second, 11_100, 2208, 740, null);
    expect(singleRender).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("switches immediately between independent multi fields and the latest single ruler, invalidating both on camera movement", () => {
    const runtime = fakeMap();
    const singleRender = vi.fn().mockReturnValue(null);
    const multiRender = vi.fn();
    const singleInvalidate = vi.fn();
    const multiInvalidate = vi.fn();
    const missileRender = vi.fn();
    const missileMany = vi.fn();
    const controller = new SatelliteMapController(runtime.map, { onStateChange: () => {}, onCameraChange: () => {} },
      { render: missileRender, renderMany: missileMany } as unknown as MissileCanvasRenderer,
      { render: singleRender, invalidateProjection: singleInvalidate } as unknown as BlastCanvasRenderer,
      null,
      { render: multiRender, invalidateProjection: multiInvalidate, dispose: vi.fn() } as unknown as MultiBlastCanvasRenderer);
    const route = { start: { longitude: -74, latitude: 41 }, control: { longitude: -73.9, latitude: 40.9 }, target: { longitude: -73.8, latitude: 40.8 } };
    const launch: Launch = { id: 1, deviceId: "fat-man", yieldMt: 0.021, route, launchedAtMs: 0, flightMs: 6500, blastMs: 4600, radii: blastRadiiForYield(0.021) };
    const frames = [{ launch, elapsedMs: 11_100 }];
    controller.setSceneFrame(frames, true);
    expect(multiRender).toHaveBeenCalledWith(frames, 2208, 740, true);
    expect(missileMany).toHaveBeenCalledWith(frames, 2208, 740);
    expect(singleRender).not.toHaveBeenCalled();
    runtime.emit("move");
    expect(singleInvalidate).toHaveBeenCalledOnce();
    expect(multiInvalidate).toHaveBeenCalledOnce();
    controller.setSceneFrame(frames, false);
    expect(singleRender).toHaveBeenLastCalledWith(launch, 11_100, 2208, 740, null);
    expect(missileRender).toHaveBeenLastCalledWith(launch, 11_100, 2208, 740);
    controller.dispose();
  });

  it("turns a bare map click into one geographic route and ignores a control click", () => {
    const runtime = fakeMap();
    const launches: unknown[] = [];
    const controller = new SatelliteMapController(runtime.map, {
      onStateChange: () => {}, onCameraChange: () => {}, onLaunch: (route) => launches.push(route), launchAngle: () => Math.PI,
      prepareLaunch: () => ({ intent: { deviceId: "fat-man", yieldMt: 0.021 }, mirvTargets: null }),
    });
    runtime.emit("click", { point: { x: 900, y: 450 }, originalEvent: { target: {} } });
    expect(launches).toHaveLength(1);
    expect(launches[0]).toMatchObject({ target: { longitude: -30, latitude: 35 } });
    expect((launches[0] as { start: { longitude: number } }).start.longitude).toBeLessThan(-30);
    controller.dispose();
  });
  it("stops after bounded unsafe MIRV camera attempts without dispatching a reversed launch", () => {
    const runtime = fakeMap();
    Object.assign(runtime.map, { project: () => ({ x: 900, y: 450 }) });
    const launches: unknown[] = [];
    const notices: (string | null)[] = [];
    const pending: boolean[] = [];
    const controller = new SatelliteMapController(runtime.map, {
      onStateChange: () => {}, onCameraChange: () => {},
      onLaunch: (route) => launches.push(route),
      prepareLaunch: (aim) => ({ intent: { deviceId: "rs-24-yars", yieldMt: 0.525 }, mirvTargets: [
        { longitude: aim.longitude - 0.1, latitude: aim.latitude + 0.02 },
        { longitude: aim.longitude + 0.1, latitude: aim.latitude - 0.02 },
      ] }),
      onPendingChange: (value) => pending.push(value),
      onLaunchUnavailable: (notice) => notices.push(notice),
    });
    runtime.emit("click", { point: { x: 900, y: 450 }, originalEvent: { target: {} } });
    for (let attempt = 0; attempt < 7; attempt += 1) runtime.emit("moveend");
    expect(runtime.fitBounds).toHaveBeenCalledTimes(7);
    expect(launches).toHaveLength(0);
    expect(pending).toEqual([true, false]);
    expect(notices.at(-1)).toMatch(/Could not frame this MIRV launch/);
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
      runtime.emit("move");
      // The scale consumes the moving camera, so it cannot wait for moveend.
      expect(cameras.at(-1)).toEqual({ longitude: -74, latitude: 41, zoom: 10.6, pitch: 0, bearing: 0 });
      runtime.emit("moveend");
      expect(states).toEqual(["ready"]);
      expect(cameras.at(-1)).toEqual({ longitude: -74, latitude: 41, zoom: 10.6, pitch: 0, bearing: 0 });
      expect(runtime.setPadding).toHaveBeenCalledWith({ top: 0, right: 0, bottom: 0, left: 380 });
      const cameraFramesBeforeResize = cameras.length;
      runtime.setViewportWidth(800);
      runtime.emit("resize");
      expect(cameras).toHaveLength(cameraFramesBeforeResize + 1);
      expect(cameras.at(-1)).toEqual({ longitude: -74, latitude: 41, zoom: 10.6, pitch: 0, bearing: 0 });
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
