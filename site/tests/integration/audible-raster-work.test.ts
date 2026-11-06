/** Fixed-camera and fake-rAF contracts cover safe culling, bounded work, cancellation, and eventual dense-scene visibility. */
import { describe, expect, it, vi } from "vitest";
import type { LaunchFrame } from "../../src/application/launch";
import { blastRadiiForYield } from "../../src/domain/blast";
import { normalizeLongitude, type GeoPoint } from "../../src/domain/geodesy";
import { AUDIBLE_PREVIEW_SAMPLES, AUDIBLE_WORK_CHUNK, audibleFieldBounds, AudibleCanvasRenderer } from "../../src/rendering/effects/AudibleCanvasRenderer";
import { captureAudibleReprojection, drawAudibleReprojection, restoreAudibleMeshAlpha } from "../../src/rendering/effects/audibleReprojection";
import { audibleColor } from "../../src/rendering/effects/audiblePalette";

const WIDTH = 2208;
const HEIGHT = 1276;
const SCALE = Math.min(0.48, 480 / WIDTH, 320 / HEIGHT);

/** Linear local camera makes one degree equal 1000 CSS pixels; tests never require live tiles. */
function cameraAt(initialCenter: GeoPoint) {
  let center = initialCenter;
  let pixelsPerDegree = 1000;
  const toGeo = vi.fn(({ x, y }: { x: number; y: number }) => ({
    longitude: normalizeLongitude(center.longitude + (x - WIDTH / 2) / pixelsPerDegree),
    latitude: center.latitude - (y - HEIGHT / 2) / pixelsPerDegree,
  }));
  const toGeoUnwrapped = vi.fn(({ x, y }: { x: number; y: number }) => ({
    longitude: center.longitude + (x - WIDTH / 2) / pixelsPerDegree,
    latitude: center.latitude - (y - HEIGHT / 2) / pixelsPerDegree,
  }));
  const toScreenUnwrapped = vi.fn(({ longitude, latitude }: GeoPoint) => ({
    x: WIDTH / 2 + (longitude - center.longitude) * pixelsPerDegree,
    y: HEIGHT / 2 - (latitude - center.latitude) * pixelsPerDegree,
  }));
  return {
    toGeo,
    toGeoUnwrapped,
    toScreenUnwrapped,
    unwrappedCenterLongitude: () => center.longitude,
    toScreen: ({ longitude, latitude }: GeoPoint) => ({
      x: WIDTH / 2 + normalizeLongitude(longitude - center.longitude) * pixelsPerDegree,
      y: HEIGHT / 2 - (latitude - center.latitude) * pixelsPerDegree,
    }),
    snapshot: () => ({ center, pitch: 0, bearing: 0, zoom: 8 + Math.log2(pixelsPerDegree / 1000) }),
    panTo: (next: GeoPoint) => { center = next; },
    zoomTo: (nextPixelsPerDegree: number) => { pixelsPerDegree = nextPixelsPerDegree; },
  };
}

/** Settled frames keep all launch IDs and yields deterministic across pan/repaint. */
function frame(id: number, target: GeoPoint, deviceId: string, yieldMt: number): LaunchFrame {
  return {
    launch: {
      id, deviceId, yieldMt,
      route: { start: target, control: target, target },
      launchedAtMs: 0, flightMs: 6500, blastMs: 4600,
      radii: blastRadiiForYield(yieldMt),
    },
    elapsedMs: 11_200,
  };
}

/** Capture mask bytes and explicitly drive queued frames without wall-clock timing. */
function canvasHarness() {
  let lastImage: ImageData | null = null;
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const context = {
    setTransform: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(),
    save: vi.fn(), restore: vi.fn(), transform: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), clip: vi.fn(),
    setLineDash: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
    createImageData: (width: number, height: number) => ({
      width, height, data: new Uint8ClampedArray(width * height * 4),
    }) as ImageData,
    putImageData: vi.fn((image: ImageData) => { lastImage = image; }),
    imageSmoothingEnabled: false,
  };
  const canvas = () => ({ width: 0, height: 0, getContext: () => context }) as unknown as HTMLCanvasElement;
  const create = vi.spyOn(document, "createElement").mockImplementation(() => canvas());
  const request = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => { callbacks.delete(id); });
  return {
    canvas, context, callbacks, cancel,
    image: () => lastImage,
    runNext: () => {
      const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!entry) return false;
      callbacks.delete(entry[0]);
      entry[1](0);
      return true;
    },
    restore: () => { create.mockRestore(); request.mockRestore(); cancel.mockRestore(); },
  };
}

/** Read the alpha of a CSS-pixel center from the current fixed-resolution mask. */
function alphaAt(image: ImageData | null, x: number, y: number): number {
  if (!image) return 0;
  const column = Math.floor(x * image.width / WIDTH);
  const row = Math.floor(y * image.height / HEIGHT);
  return image.data[(row * image.width + column) * 4 + 3]!;
}

describe("Audible raster work budget", () => {
  it("restores the same field opacity through partial triangle clip coverage", () => {
    const [red, green, blue, alpha] = audibleColor(0.6);
    const image = { width: 3, height: 1, data: new Uint8ClampedArray([
      red, green, blue, Math.round(alpha * 0.45),
      red, green, blue, Math.round(alpha * 0.9),
      0, 0, 0, 0,
    ]) } as ImageData;
    restoreAudibleMeshAlpha(image);
    // RGB channels are 8-bit rounded, so the inverse palette may differ by
    // a few alpha levels; a >20% seam would be clearly visible in motion.
    expect(image.data[3]).toBeCloseTo(alpha, -1);
    expect(image.data[7]).toBe(image.data[3]);
    expect(image.data[11]).toBe(0);
  });

  it("uses a complete fallback preview when initial circle projection is unavailable", () => {
    const harness = canvasHarness();
    try {
      const origin = { longitude: -74, latitude: 40 };
      const camera = cameraAt(origin);
      const projector = { ...camera, toScreen: () => { throw new Error("transient projection"); } };
      const renderer = new AudibleCanvasRenderer(harness.canvas(), projector as never, harness.canvas());
      const frames = [frame(1, origin, "fat-man", 0.021)];
      renderer.render(frames, WIDTH, HEIGHT, false, null); // Controller priming was unavailable.
      const previewMask = harness.context.drawImage.mock.lastCall![0];
      expect(previewMask.width * previewMask.height).toBeLessThanOrEqual(AUDIBLE_PREVIEW_SAMPLES);
      expect(harness.callbacks.size).toBe(1); // Full refinement is still pending.
      const draws = harness.context.drawImage.mock.calls.length;
      camera.panTo({ longitude: -74.03, latitude: 40 });
      renderer.invalidateProjection();
      renderer.render(frames, WIDTH, HEIGHT, false, null);
      expect(harness.context.drawImage.mock.calls.length).toBeGreaterThan(draws);
      expect(harness.context.drawImage.mock.lastCall![0]).toBe(previewMask);
      renderer.dispose();
    } finally { harness.restore(); }
  });

  it("retries a bounded moving-camera sample when the entry target was initially offscreen", () => {
    const harness = canvasHarness();
    try {
      const camera = cameraAt({ longitude: -74, latitude: 40 });
      const target = { longitude: -60, latitude: 40 };
      const frames = [frame(1, target, "w54", 0.00002)];
      const renderer = new AudibleCanvasRenderer(harness.canvas(), camera as never, harness.canvas());
      renderer.primeFirstEntry(frames, WIDTH, HEIGHT);
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      expect(harness.context.drawImage).not.toHaveBeenCalled();
      camera.panTo(target);
      renderer.invalidateProjection();
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      expect(alphaAt(harness.image(), WIDTH / 2, HEIGHT / 2)).toBeGreaterThan(0);
      expect(camera.toGeo.mock.calls.length).toBeLessThanOrEqual(AUDIBLE_WORK_CHUNK);
      renderer.dispose();
    } finally { harness.restore(); }
  });

  it("keeps a complete bounded first-entry preview geographically anchored through camera ease", () => {
    const harness = canvasHarness();
    try {
      const origin = { longitude: -74, latitude: 40 };
      const camera = cameraAt(origin);
      const renderer = new AudibleCanvasRenderer(harness.canvas(), camera as never, harness.canvas());
      const frames = [frame(1, origin, "fat-man", 0.021)];
      renderer.primeFirstEntry(frames, WIDTH, HEIGHT);
      const previewImage = harness.image();
      expect(previewImage).not.toBeNull();
      expect(previewImage!.width * previewImage!.height).toBeLessThanOrEqual(AUDIBLE_PREVIEW_SAMPLES);
      expect(alphaAt(previewImage, WIDTH / 2, HEIGHT / 2)).toBeGreaterThan(0);
      expect(alphaAt(previewImage, WIDTH / 2 + 350, HEIGHT / 2)).toBeGreaterThan(0);
      expect(harness.callbacks.size).toBe(0);
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      expect(harness.callbacks.size).toBe(1);
      const previewMask = harness.context.drawImage.mock.lastCall![0];
      expect(previewMask.width * previewMask.height).toBeLessThanOrEqual(AUDIBLE_PREVIEW_SAMPLES);
      const sampled = camera.toGeo.mock.calls.length;
      camera.panTo({ longitude: -74.08, latitude: 40 });
      renderer.invalidateProjection();
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      expect(camera.toGeo).toHaveBeenCalledTimes(sampled);
      expect(harness.context.drawImage.mock.lastCall![0]).toBe(previewMask);
      expect(harness.context.transform.mock.lastCall![4]).toBeCloseTo(80, 5);
      expect(harness.callbacks.size).toBe(0);
      renderer.settleProjection();
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      expect(harness.context.drawImage.mock.lastCall![0]).toBe(previewMask);
      while (harness.runNext()) { /* The settled full mask replaces the first-entry preview. */ }
      expect(harness.context.drawImage.mock.lastCall![0]).not.toBe(previewMask);
      renderer.dispose();
    } finally { harness.restore(); }
  });

  it("retains the overscanned preview when a full viewport mask finishes before the first move", () => {
    const harness = canvasHarness();
    try {
      const origin = { longitude: -74, latitude: 40 };
      const camera = cameraAt(origin);
      const renderer = new AudibleCanvasRenderer(harness.canvas(), camera as never, harness.canvas());
      const frames = [frame(1, origin, "fat-man", 0.021)];
      renderer.primeFirstEntry(frames, WIDTH, HEIGHT);
      renderer.render(frames, WIDTH, HEIGHT, false, null);
      const previewMask = harness.context.drawImage.mock.lastCall![0];
      while (harness.runNext()) { /* Simulate a delayed map move after full refinement. */ }
      const fullMask = harness.context.drawImage.mock.lastCall![0];
      expect(fullMask).not.toBe(previewMask);
      const sampled = camera.toGeo.mock.calls.length;
      camera.panTo({ longitude: -74.08, latitude: 40 });
      renderer.invalidateProjection();
      renderer.render(frames, WIDTH, HEIGHT, false, null);
      expect(harness.context.drawImage.mock.lastCall![0]).toBe(previewMask);
      expect(camera.toGeo).toHaveBeenCalledTimes(sampled);
      renderer.settleProjection();
      renderer.render(frames, WIDTH, HEIGHT, false, null);
      while (harness.runNext()) { /* Settled camera replaces the preview. */ }
      expect(harness.context.drawImage.mock.lastCall![0]).not.toBe(previewMask);
      renderer.dispose();
    } finally { harness.restore(); }
  });

  it("samples beyond the starting viewport when the hearing circle extends across it", () => {
    const harness = canvasHarness();
    try {
      const origin = { longitude: -74, latitude: 40 };
      const camera = cameraAt(origin);
      camera.zoomTo(5000); // A close Blast camera makes the Audible field wider than the viewport.
      const renderer = new AudibleCanvasRenderer(harness.canvas(), camera as never, harness.canvas());
      const frames = [frame(1, origin, "fat-man", 0.021)];
      renderer.primeFirstEntry(frames, WIDTH, HEIGHT);
      const sampledX = camera.toGeo.mock.calls.map(([point]) => point.x);
      expect(sampledX.length).toBeGreaterThan(0);
      expect(Math.min(...sampledX)).toBeLessThan(0);
      expect(Math.max(...sampledX)).toBeGreaterThan(WIDTH);
      expect(sampledX.length).toBeLessThanOrEqual(AUDIBLE_PREVIEW_SAMPLES);
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      const mask = harness.context.drawImage.mock.lastCall![0];
      const samplesBeforeMove = camera.toGeo.mock.calls.length;
      camera.zoomTo(1500);
      renderer.invalidateProjection();
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      expect(harness.context.drawImage.mock.lastCall![0]).toBe(mask);
      expect(camera.toGeo).toHaveBeenCalledTimes(samplesBeforeMove);
      renderer.dispose();
    } finally { harness.restore(); }
  });

  it("builds a bounded full-world preview when a 20 Tt field reaches the antipode", () => {
    const harness = canvasHarness();
    try {
      const origin = { longitude: -74, latitude: 40 };
      const camera = cameraAt(origin);
      const renderer = new AudibleCanvasRenderer(harness.canvas(), camera as never, harness.canvas());
      const frames = [frame(1, origin, "large-continent", 20_000_000)];
      renderer.primeFirstEntry(frames, WIDTH, HEIGHT);
      const image = harness.image();
      expect(image).not.toBeNull();
      expect(image!.width * image!.height).toBeLessThanOrEqual(AUDIBLE_PREVIEW_SAMPLES);
      expect(harness.callbacks.size).toBe(0); // One complete preview, never a partial rectangle.
      const sampledX = camera.toGeo.mock.calls.map(([point]) => point.x);
      expect(Math.min(...sampledX)).toBeLessThan(0);
      expect(Math.max(...sampledX)).toBeGreaterThan(WIDTH);
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      expect(harness.context.drawImage).toHaveBeenCalled();
      renderer.dispose();
    } finally { harness.restore(); }
  });

  it("finishes a ten-delivery first-entry preview within one shared sample budget", () => {
    const harness = canvasHarness();
    try {
      const origin = { longitude: -74, latitude: 40 };
      const camera = cameraAt(origin);
      const renderer = new AudibleCanvasRenderer(harness.canvas(), camera as never, harness.canvas());
      const frames = Array.from({ length: 10 }, (_, index) => frame(index + 1, origin, "w54", 0.00002));
      renderer.primeFirstEntry(frames, WIDTH, HEIGHT);
      const image = harness.image();
      expect(image).not.toBeNull();
      expect(image!.width * image!.height * frames.length).toBeLessThanOrEqual(AUDIBLE_PREVIEW_SAMPLES);
      expect(harness.callbacks.size).toBe(0);
      expect(alphaAt(image, WIDTH / 2, HEIGHT / 2)).toBeGreaterThan(0);
      renderer.dispose();
    } finally { harness.restore(); }
  });

  it("reprojects a completed field through zoom without resampling hearing distance", () => {
    const harness = canvasHarness();
    try {
      const origin = { longitude: -74, latitude: 40 };
      const camera = cameraAt(origin);
      const renderer = new AudibleCanvasRenderer(harness.canvas(), camera as never, harness.canvas());
      renderer.render([frame(1, origin, "w54", 0.00002)], WIDTH, HEIGHT, true, null);
      const samples = camera.toGeo.mock.calls.length;
      const writes = harness.context.putImageData.mock.calls.length;
      camera.zoomTo(2000);
      renderer.invalidateProjection();
      renderer.render([frame(1, origin, "w54", 0.00002)], WIDTH, HEIGHT, true, null);
      expect(camera.toGeo).toHaveBeenCalledTimes(samples);
      expect(harness.context.putImageData).toHaveBeenCalledTimes(writes);
      expect(harness.context.transform.mock.lastCall![0]).toBeCloseTo(2, 6);
      expect(harness.context.transform.mock.lastCall![3]).toBeCloseTo(2, 6);
      expect(harness.context.transform.mock.lastCall![4]).toBeCloseTo(-WIDTH / 2, 6);
      renderer.dispose();
    } finally { harness.restore(); }
  });

  it("uses small geographic mesh cells under pitch and keeps world-copy alignment across the antimeridian", () => {
    const harness = canvasHarness();
    try {
      const seam = cameraAt({ longitude: 179.8, latitude: 40 });
      const source = harness.canvas();
      source.width = 480; source.height = 278;
      const flatMesh = captureAudibleReprojection(seam as never, WIDTH, HEIGHT);
      seam.panTo({ longitude: -179.9, latitude: 40 });
      expect(drawAudibleReprojection(harness.context as never, source, flatMesh, seam as never)).toBe(true);
      expect(harness.context.transform.mock.lastCall![4]).toBeCloseTo(-300, 5);
      const pitched = { ...seam, snapshot: () => ({ center: { longitude: -179.9, latitude: 40 }, pitch: 40, bearing: 0, zoom: 8 }) };
      const pitchedMesh = captureAudibleReprojection(pitched as never, WIDTH, HEIGHT);
      harness.context.drawImage.mockClear();
      expect(drawAudibleReprojection(harness.context as never, source, pitchedMesh, pitched as never)).toBe(true);
      expect(harness.context.drawImage).toHaveBeenCalledTimes(192); // 12 × 8 cells, two ground triangles each.
      for (const args of harness.context.drawImage.mock.calls) {
        expect(args).toHaveLength(9);
        expect(args[3]).toBeLessThan(source.width); // Reproject a cell, never the full mask per triangle.
      }
      expect(harness.context.drawImage.mock.calls.some((args) => args[3] > source.width / 12 + 1)).toBe(true);
      expect(harness.context.moveTo.mock.calls[0]![0]).toBeLessThan(0); // Clip extends past the first mesh edge.
      expect(harness.context.moveTo.mock.calls[0]![1]).toBeLessThan(0);
      expect(seam.toGeo).not.toHaveBeenCalled();
    } finally { harness.restore(); }
  });

  it("culls only safe offscreen caps and keeps pitched or wrap-ambiguous views fully sampled", () => {
    const camera = cameraAt({ longitude: -74, latitude: 40 });
    const remote = { longitude: -62, latitude: 40 };
    expect(audibleFieldBounds(camera as never, remote, 6, WIDTH, HEIGHT, SCALE)).toBeNull();
    const local = audibleFieldBounds(camera as never, { longitude: -74, latitude: 40 }, 6, WIDTH, HEIGHT, SCALE)!;
    expect(local.left).toBeGreaterThan(0);
    expect(local.right).toBeLessThan(479);
    const pitched = { ...camera, snapshot: () => ({ center: { longitude: -74, latitude: 40 }, pitch: 35, bearing: 0, zoom: 8 }) };
    const full = { left: 0, top: 0, right: Math.ceil(WIDTH * SCALE) - 1, bottom: Math.ceil(HEIGHT * SCALE) - 1 };
    expect(audibleFieldBounds(pitched as never, remote, 6, WIDTH, HEIGHT, SCALE)).toEqual(full);
    const repeatedWorld = { ...camera, snapshot: () => ({ center: { longitude: -74, latitude: 40 }, pitch: 0, bearing: 0, zoom: 2 }) };
    expect(audibleFieldBounds(repeatedWorld as never, remote, 6, WIDTH, HEIGHT, SCALE)).toEqual(full);
    const seam = cameraAt({ longitude: 179.8, latitude: 40 });
    expect(audibleFieldBounds(seam as never, { longitude: -179.9, latitude: 40 }, 6, WIDTH, HEIGHT, SCALE)).not.toBeNull();
    expect(audibleFieldBounds(seam as never, { longitude: -0.3, latitude: 40 }, 6, WIDTH, HEIGHT, SCALE)).toEqual(full);
  });

  it("bounds the first dense repaint, cancels a stale pan job, and eventually shows an older small field", () => {
    const harness = canvasHarness();
    try {
      const camera = cameraAt({ longitude: -74, latitude: 40 });
      const newer = { longitude: -73.2, latitude: 40 };
      const older = { longitude: -74.4, latitude: 40 };
      // Nine broad visible fields require multiple rAF chunks. Ninety newer
      // offscreen fields precede an older small W54 field in the retained array.
      const frames = [
        ...Array.from({ length: 9 }, (_, index) => frame(index + 2, newer, "little-boy", 0.015)),
        ...Array.from({ length: 90 }, (_, index) => frame(index + 11, { longitude: -60, latitude: 40 }, "w54", 0.00002)),
        frame(1, older, "w54", 0.00002),
      ];
      const renderer = new AudibleCanvasRenderer(harness.canvas(), camera as never, harness.canvas());
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      expect(harness.callbacks.size).toBe(1);
      expect(camera.toGeo.mock.calls.length).toBeLessThanOrEqual(AUDIBLE_WORK_CHUNK);
      expect(alphaAt(harness.image(), 704, HEIGHT / 2)).toBe(0);
      const stale = harness.callbacks.values().next().value as FrameRequestCallback;
      camera.panTo(older);
      renderer.invalidateProjection();
      expect(harness.cancel).toHaveBeenCalled();
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      renderer.settleProjection();
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      const putCount = harness.context.putImageData.mock.calls.length;
      expect(alphaAt(harness.image(), WIDTH / 2, HEIGHT / 2)).toBe(0);
      stale(0); // Even a callback already dispatched by the browser is inert.
      expect(harness.context.putImageData).toHaveBeenCalledTimes(putCount);
      let steps = 0;
      while (harness.runNext()) {
        steps++;
        expect(steps).toBeLessThan(30);
      }
      expect(steps).toBeGreaterThan(0);
      expect(alphaAt(harness.image(), WIDTH / 2, HEIGHT / 2)).toBeGreaterThan(0);
      const samplesAfterCompletion = camera.toGeo.mock.calls.length;
      renderer.render(frames, WIDTH, HEIGHT, true, "faint");
      expect(camera.toGeo).toHaveBeenCalledTimes(samplesAfterCompletion);
      const oldMask = harness.context.drawImage.mock.lastCall![0];
      const writesBeforeMove = harness.context.putImageData.mock.calls.length;
      const projectionsBeforeMove = camera.toScreenUnwrapped.mock.calls.length;
      camera.panTo({ longitude: older.longitude - 0.08, latitude: older.latitude });
      renderer.invalidateProjection();
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      expect(camera.toGeo).toHaveBeenCalledTimes(samplesAfterCompletion);
      expect(harness.context.putImageData).toHaveBeenCalledTimes(writesBeforeMove);
      expect(camera.toScreenUnwrapped.mock.calls.length - projectionsBeforeMove).toBe(3); // Exact flat-map affine, independent of 100 strikes.
      expect(harness.context.transform.mock.lastCall![4]).toBeCloseTo(80, 5);
      expect(harness.context.drawImage.mock.lastCall![0]).toBe(oldMask);
      renderer.settleProjection();
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      expect(harness.callbacks.size).toBe(1);
      expect(harness.context.drawImage.mock.lastCall![0]).toBe(oldMask); // No blank at the rebuild swap boundary.
      while (harness.runNext()) { /* The new camera mask replaces the moving cache only when complete. */ }
      expect(harness.context.drawImage.mock.lastCall![0]).not.toBe(oldMask);
      renderer.invalidateProjection();
      renderer.settleProjection();
      renderer.render(frames, WIDTH, HEIGHT, true, null);
      expect(harness.callbacks.size).toBe(1);
      const disposedCallback = harness.callbacks.values().next().value as FrameRequestCallback;
      const writesBeforeDispose = harness.context.putImageData.mock.calls.length;
      renderer.dispose();
      expect(harness.callbacks.size).toBe(0);
      disposedCallback(0);
      expect(harness.context.putImageData).toHaveBeenCalledTimes(writesBeforeDispose);
    } finally { harness.restore(); }
  });
});
