/** Multi-field contracts cover bounded sampling, camera scale, palette, and expansion tails. */
import { describe, expect, it, vi } from "vitest";
import { blastRadiiForYield } from "../../src/domain/blast";
import { advanceMultiFieldWork, createMultiFieldWork, expandingBlastIntensity, multiFieldBudget, MultiBlastCanvasRenderer, MULTI_FIELD_WORK_CHUNK } from "../../src/rendering/effects/MultiBlastCanvasRenderer";
import { composedBlastColor, multiBlastColor, multiBlastDisplayIntensity, multiBlastHueIntensity } from "../../src/rendering/effects/multiBlastPalette";
import { combineBlastPeakAndSum } from "../../src/domain/overlap";
import { buildBlastGroundGrid, type BlastGroundGrid } from "../../src/rendering/effects/blastFieldGeometry";
import type { Launch, LaunchFrame } from "../../src/application/launch";
import { mapDistanceScale } from "../../src/rendering/overlays/mapDistanceScale";

describe("multi-strike rendering contracts", () => {
  it("limits shared mask resolution while retaining small fields in dense scenes", () => {
    const small = multiFieldBudget(2);
    const five = multiFieldBudget(5);
    const dense = multiFieldBudget(20);
    expect(five).toEqual(small);
    expect(dense.width * dense.height).toBeLessThan(five.width * five.height);
    expect(dense.frameMs).toBeGreaterThan(five.frameMs);
    // One shared mask stays fixed above 16 strikes. A shrinking 45-pixel-wide
    // dense mask could skip an old W54 field between adjacent samples.
    for (const count of [16, 32, 100, 256, 1000, 10_000]) {
      const budget = multiFieldBudget(count);
      expect(budget).toEqual({ width: 320, height: 220, frameMs: 50 });
    }
  });

  it("keeps an older small W54 field visible after one thousand later offscreen launches", () => {
    const width = 2208;
    const height = 740;
    // At this camera scale W54's light radius spans only about seven CSS px.
    // x=1129 lies between samples of the formerly shrinking dense mask.
    const camera = { toGeo: ({ x, y }: { x: number; y: number }) => ({ longitude: -74 + (x - 1104) * 0.001, latitude: 40 + (y - 370) * 0.001 }) };
    const target = camera.toGeo({ x: 1129, y: 370 });
    const faraway = { longitude: 120, latitude: -20 };
    const w54Radii = blastRadiiForYield(0.00002);
    const frames = Array.from({ length: 1000 }, (_, index): LaunchFrame => {
      const origin = index === 0 ? target : faraway;
      return {
        launch: {
          id: index + 1, deviceId: "w54", yieldMt: 0.00002,
          route: { start: origin, control: origin, target: origin },
          launchedAtMs: 0, flightMs: 6500, blastMs: 4600, radii: w54Radii,
        },
        elapsedMs: 11_100,
      };
    });
    const ground = buildBlastGroundGrid(camera, width, height, multiFieldBudget(frames.length));
    const work = createMultiFieldWork(frames, ground);
    let complete = false;
    for (let step = 0; step < 4 && !complete; step += 1) {
      const result = advanceMultiFieldWork(work, MULTI_FIELD_WORK_CHUNK, 1024);
      expect(result.evaluations).toBeLessThanOrEqual(MULTI_FIELD_WORK_CHUNK);
      expect(result.visitedLaunches).toBeLessThanOrEqual(1024);
      complete = result.complete;
    }
    expect(complete).toBe(true);
    expect(Math.max(...work.peak)).toBeGreaterThan(0);
    expect(work.nextFrame).toBe(frames.length);
  });

  it("rebuilds one shared ground mask when a strike-count budget tier changes", () => {
    const camera = { toGeo: ({ x, y }: { x: number; y: number }) => ({ longitude: -74 + x / 1000, latitude: 40 + y / 1000 }) };
    const five = buildBlastGroundGrid(camera, 1000, 800, multiFieldBudget(5));
    const six = buildBlastGroundGrid(camera, 1000, 800, multiFieldBudget(6));
    expect(five.width * five.height).toBeGreaterThan(six.width * six.height);
    expect(five.longitudes).toHaveLength(five.width * five.height);
    expect(six.latitudes).toHaveLength(six.width * six.height);
    expect(five.center).toEqual({ longitude: -73.5, latitude: 40.4 });
  });

  it("invalidates the renderer's shared camera samples when the sixth strike changes mask resolution", () => {
    const toGeo = vi.fn(({ x, y }: { x: number; y: number }) => ({ longitude: -74 + x / 10_000, latitude: 40 + y / 10_000 }));
    const camera = { snapshot: () => ({ pitch: 0 }), toGeo, toScreen: () => ({ x: 400, y: 350 }) };
    const gradient = { addColorStop: () => {} };
    const context = {
      setTransform: () => {}, clearRect: () => {}, save: () => {}, restore: () => {}, drawImage: () => {},
      createImageData: (width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: () => {}, createRadialGradient: () => gradient, beginPath: () => {}, arc: () => {}, fill: () => {},
    };
    const canvas = () => ({ width: 0, height: 0, getContext: () => context });
    const createElement = vi.spyOn(document, "createElement").mockReturnValue(canvas() as unknown as HTMLCanvasElement);
    try {
      const renderer = new MultiBlastCanvasRenderer(canvas() as unknown as HTMLCanvasElement, camera as never);
      const origin = { longitude: -73.96, latitude: 40.73 };
      const radii = blastRadiiForYield(0.021);
      const frames = Array.from({ length: 6 }, (_, index): LaunchFrame => ({
        launch: { id: index + 1, deviceId: "fat-man", yieldMt: 0.021, route: { start: origin, control: origin, target: origin }, launchedAtMs: 0, flightMs: 6500, blastMs: 4600, radii },
        elapsedMs: 11_100,
      }));
      renderer.render(frames.slice(0, 5), 800, 700);
      const firstGridCalls = toGeo.mock.calls.length;
      renderer.render(frames.slice(0, 5), 800, 700);
      expect(toGeo).toHaveBeenCalledTimes(firstGridCalls);
      renderer.render(frames, 800, 700);
      expect(toGeo.mock.calls.length).toBeGreaterThan(firstGridCalls);
      expect(toGeo.mock.calls.length - firstGridCalls).toBeLessThan(100_000);
      renderer.dispose();
    } finally {
      createElement.mockRestore();
    }
  });

  it("admits only the newest eight pitched optical rasters and reuses them for ten-warhead repaints", () => {
    const gradient = { addColorStop: () => {} };
    const context = {
      setTransform: () => {}, clearRect: () => {}, save: () => {}, restore: () => {}, drawImage: () => {},
      createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: () => {}, createRadialGradient: () => gradient, beginPath: () => {}, arc: () => {}, fill: () => {},
    };
    const canvas = () => ({ width: 0, height: 0, getContext: () => context });
    const createElement = vi.spyOn(document, "createElement").mockImplementation(() => canvas() as unknown as HTMLCanvasElement);
    const camera = {
      snapshot: () => ({ pitch: 45 }),
      toGeo: ({ x, y }: { x: number; y: number }) => ({ longitude: -74 + x / 10_000, latitude: 40 + y / 10_000 }),
      toScreen: ({ longitude, latitude }: { longitude: number; latitude: number }) => ({ x: (longitude + 74) * 10_000, y: (latitude - 40) * 10_000 }),
    };
    const frames = Array.from({ length: 10 }, (_, index): LaunchFrame => {
      const origin = { longitude: -73.98 + index * .0001, latitude: 40.015 };
      return { launch: { id: index + 1, deviceId: "rsm-56-bulava", yieldMt: .12, route: { start: origin, control: origin, target: origin }, launchedAtMs: 0, flightMs: 6500, blastMs: 4600, radii: blastRadiiForYield(.12) }, elapsedMs: 11_100 };
    });
    const renderer = new MultiBlastCanvasRenderer(canvas() as unknown as HTMLCanvasElement, camera as never);
    try {
      renderer.render(frames, 400, 300);
      expect(createElement).toHaveBeenCalledTimes(9); // one shared field + eight admitted optical bitmaps
      for (let count = 0; count < 12; count++) renderer.render(frames, 400, 300);
      expect(createElement).toHaveBeenCalledTimes(9);
      renderer.invalidateProjection(); renderer.render(frames, 400, 300);
      expect(createElement).toHaveBeenCalledTimes(18); // one bounded rebuild, then reuse again
      renderer.render(frames, 400, 300); expect(createElement).toHaveBeenCalledTimes(18);
    } finally { renderer.dispose(); createElement.mockRestore(); }
  });

  it("preserves the grouped single-launch inspection through an asynchronous field continuation", () => {
    // More than 1,024 offscreen deliveries force a second chunk without costly
    // geodesic sampling; the separate inspection canvas stands in for the ruler.
    const clearInspection = vi.fn();
    const gradient = { addColorStop: () => {} };
    const fieldContext = {
      setTransform: () => {}, clearRect: () => {}, save: () => {}, restore: () => {}, drawImage: () => {},
      createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: () => {}, createRadialGradient: () => gradient, beginPath: () => {}, arc: () => {}, fill: () => {},
    };
    const inspection = { width: 30, height: 20, getContext: () => ({ clearRect: clearInspection }) };
    const canvas = () => ({ width: 30, height: 20, getContext: () => fieldContext });
    const createElement = vi.spyOn(document, "createElement").mockReturnValue(canvas() as unknown as HTMLCanvasElement);
    let continuation: FrameRequestCallback | undefined;
    const requestFrame = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      continuation = callback;
      return 1;
    });
    const cancelFrame = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
    try {
      const viewport = { longitude: -74, latitude: 40 };
      const remote = { longitude: 120, latitude: -20 };
      const camera = {
        snapshot: () => ({ pitch: 0 }),
        toGeo: ({ x, y }: { x: number; y: number }) => ({ longitude: viewport.longitude + x / 1000, latitude: viewport.latitude + y / 1000 }),
        toScreen: () => ({ x: 10, y: 10 }),
      };
      const radii = blastRadiiForYield(0.021);
      const frames = Array.from({ length: 1025 }, (_, index): LaunchFrame => ({
        launch: {
          id: index + 1, deviceId: "fat-man", yieldMt: 0.021,
          route: { start: remote, control: remote, target: remote }, launchedAtMs: 0,
          flightMs: 6500, blastMs: 4600, radii,
        },
        elapsedMs: 11_100,
      }));
      const renderer = new MultiBlastCanvasRenderer(canvas() as unknown as HTMLCanvasElement, camera as never, inspection as unknown as HTMLCanvasElement);
      renderer.render(frames, 30, 20, false);
      expect(continuation).toBeTypeOf("function");
      expect(clearInspection).not.toHaveBeenCalled();
      continuation!(0);
      expect(clearInspection).not.toHaveBeenCalled();
      renderer.render(frames, 30, 20, true);
      expect(clearInspection).toHaveBeenCalledOnce();
      renderer.invalidateProjection();
      renderer.render(frames, 30, 20, false); // start another pending chunk before Reset/disposal
      renderer.dispose();
      expect(cancelFrame).toHaveBeenCalled();
      const callsAtDisposal = clearInspection.mock.calls.length;
      continuation!(0); // even an already-delivered stale callback has no latest request
      expect(clearInspection).toHaveBeenCalledTimes(callsAtDisposal);
    } finally {
      createElement.mockRestore();
      requestFrame.mockRestore();
      cancelFrame.mockRestore();
    }
  });

  it("finishes every visible strike in bounded chunks and conservatively skips only distant fields", () => {
    const radii = blastRadiiForYield(0.021);
    const target = { longitude: -73.98, latitude: 40.75 };
    const launch = (id: number, longitude = target.longitude): Launch => ({
      id, deviceId: "fat-man", yieldMt: 0.021, route: { start: target, control: target, target: { longitude, latitude: target.latitude } },
      launchedAtMs: 0, flightMs: 6500, blastMs: 4600, radii,
    });
    const frames: LaunchFrame[] = [1, 2, 3].map((id) => ({ launch: launch(id), elapsedMs: 11_100 }));
    frames.push({ launch: launch(4, 120), elapsedMs: 11_100 });
    const ground: BlastGroundGrid = {
      width: 2, height: 1, longitudes: new Float64Array([target.longitude, target.longitude + 0.001]),
      latitudes: new Float64Array([target.latitude, target.latitude]), center: target, farthestFromCenterKm: 0.1,
    };
    const work = createMultiFieldWork(frames, ground);
    let complete = false;
    let totalEvaluations = 0;
    for (let step = 0; step < 8 && !complete; step += 1) {
      const result = advanceMultiFieldWork(work, 2, 1);
      expect(result.evaluations).toBeLessThanOrEqual(2);
      expect(result.visitedLaunches).toBeLessThanOrEqual(1);
      complete = result.complete;
      totalEvaluations += result.evaluations;
    }
    expect(complete).toBe(true);
    expect(totalEvaluations).toBe(6); // three visible strikes × two geographic samples
    expect(work.nextFrame).toBe(frames.length);
    expect(work.sum[0]).toBeGreaterThan(work.peak[0]! * 2.9);
  });

  it("renders an expanding front with a soft falloff that vanishes outside the modeled tail", () => {
    const radii = blastRadiiForYield(0.021);
    const travelled = radii.light / 2;
    expect(expandingBlastIntensity(0, radii, travelled)).toBe(1);
    expect(expandingBlastIntensity(travelled * 1.1, radii, travelled)).toBeGreaterThan(0);
    expect(expandingBlastIntensity(travelled * 1.25, radii, travelled)).toBe(0);
  });

  it("uses a purple-to-yellow thermal palette and a camera-derived stable scale", () => {
    const faint = multiBlastColor(0.1);
    const hot = multiBlastColor(0.9);
    expect(faint.blue).toBeGreaterThan(faint.red);
    expect(hot.red).toBeGreaterThan(hot.blue);
    const original = mapDistanceScale(40.7484, 10.6);
    const zoomed = mapDistanceScale(40.7484, 11.6);
    expect(mapDistanceScale(40.7484, 10.6)).toEqual(original);
    expect(zoomed.distanceKm).toBeLessThanOrEqual(original.distanceKm);
    expect(original.widthPx).toBeGreaterThanOrEqual(54);
    expect(zoomed.widthPx).toBeLessThanOrEqual(158);
  });

  it("preserves normalized intensity instead of dimming an isolated multi field", () => {
    expect(multiBlastDisplayIntensity(0)).toBe(0);
    expect(multiBlastDisplayIntensity(1)).toBe(1);
    expect(multiBlastDisplayIntensity(0.25)).toBe(0.25);
    expect(multiBlastDisplayIntensity(0.75)).toBe(0.75);
    expect(multiBlastDisplayIntensity(0.9)).toBeGreaterThan(0.8);
    expect(multiBlastDisplayIntensity(0.9)).toBeGreaterThan(multiBlastDisplayIntensity(0.75));
  });

  it("warms actual overlap with bounded opacity while retaining an isolated sample exactly", () => {
    const sample = (count: number) => {
      const peak = 0.14;
      const sum = peak * count;
      const display = multiBlastDisplayIntensity(combineBlastPeakAndSum(peak, sum));
      return { color: multiBlastColor(multiBlastHueIntensity(display, peak, sum)), opacity: multiBlastColor(display).alpha };
    };
    const one = sample(1);
    const two = sample(2);
    const three = sample(3);
    expect(one.color.blue).toBeGreaterThan(one.color.red);
    expect(two.color.red).toBeGreaterThan(two.color.blue);
    expect(three.color.red - three.color.blue).toBeGreaterThan(two.color.red - two.color.blue);
    expect(composedBlastColor(.14, .14, one.color)).toEqual(one.color);
    expect(multiBlastHueIntensity(0.5, 0.34, 0.68)).toBeGreaterThan(0.5);
    expect(multiBlastHueIntensity(0.5, 0.34, 0.68)).toBeLessThanOrEqual(0.66);
    expect(one.opacity).toBeLessThan(two.opacity);
    const lightPeak = 0.14;
    const oneLight = multiBlastColor(multiBlastDisplayIntensity(lightPeak));
    const twoLightModeled = combineBlastPeakAndSum(lightPeak, lightPeak * 2);
    const twoLightDisplay = multiBlastDisplayIntensity(twoLightModeled);
    const twoLight = multiBlastColor(multiBlastHueIntensity(twoLightDisplay, lightPeak, lightPeak * 2));
    expect(oneLight.blue).toBeGreaterThan(oneLight.red);
    expect(twoLight.red).toBeGreaterThan(twoLight.blue);
    expect(twoLight.red - oneLight.red).toBeGreaterThan(50);
    const hotPeak = 0.7;
    const hotDisplay = multiBlastDisplayIntensity(combineBlastPeakAndSum(hotPeak, hotPeak * 3));
    const hotHue = multiBlastHueIntensity(hotDisplay, hotPeak, hotPeak * 3);
    expect(hotDisplay).toBeGreaterThan(0.7);
    expect(hotHue).toBe(hotDisplay);
    expect(multiBlastColor(hotHue).green).toBeLessThan(230); // amber, not a white sheet
  });
});
