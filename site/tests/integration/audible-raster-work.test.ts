/** Fixed-camera and fake-rAF contracts cover safe culling, bounded work, cancellation, and eventual dense-scene visibility. */
import { describe, expect, it, vi } from "vitest";
import type { LaunchFrame } from "../../src/application/launch";
import { blastRadiiForYield } from "../../src/domain/blast";
import { normalizeLongitude, type GeoPoint } from "../../src/domain/geodesy";
import { AUDIBLE_WORK_CHUNK, audibleFieldBounds, AudibleCanvasRenderer } from "../../src/rendering/effects/AudibleCanvasRenderer";

const WIDTH = 2208;
const HEIGHT = 1276;
const SCALE = Math.min(0.48, 480 / WIDTH, 320 / HEIGHT);

/** Linear local camera makes one degree equal 1000 CSS pixels; tests never require live tiles. */
function cameraAt(initialCenter: GeoPoint) {
  let center = initialCenter;
  const toGeo = vi.fn(({ x, y }: { x: number; y: number }) => ({
    longitude: normalizeLongitude(center.longitude + (x - WIDTH / 2) / 1000),
    latitude: center.latitude - (y - HEIGHT / 2) / 1000,
  }));
  return {
    toGeo,
    toScreen: ({ longitude, latitude }: GeoPoint) => ({
      x: WIDTH / 2 + normalizeLongitude(longitude - center.longitude) * 1000,
      y: HEIGHT / 2 - (latitude - center.latitude) * 1000,
    }),
    snapshot: () => ({ center, pitch: 0, bearing: 0, zoom: 8 }),
    panTo: (next: GeoPoint) => { center = next; },
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
  const column = Math.floor(x * SCALE);
  const row = Math.floor(y * SCALE);
  return image.data[(row * image.width + column) * 4 + 3]!;
}

describe("Audible raster work budget", () => {
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
      renderer.invalidateProjection();
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
