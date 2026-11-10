/** V-03/V-04/M-06: shared geographic samples preserve single RGBA, including expansion tails; only real overlaps warm. */
import { describe, expect, it } from "vitest";
import { DEVICES } from "../../src/catalog/devices";
import { blastRadiiForYield } from "../../src/domain/blast";
import { destinationPoint, surfaceDistanceKm, type GeoPoint } from "../../src/domain/geodesy";
import type { LaunchFrame } from "../../src/application/launch";
import { blastColor, createBlastFieldSampler } from "../../src/rendering/effects/blastPalette";
import { composedBlastColor, multiBlastColor, writeComposedBlastSample } from "../../src/rendering/effects/multiBlastPalette";
import { advanceMultiFieldWork, createMultiFieldWork, MULTI_FIELD_WORK_CHUNK, type MultiFieldWorkState } from "../../src/rendering/effects/MultiBlastCanvasRenderer";
import { blastExpansion } from "../../src/rendering/animation/blastTiming";

const origin = { longitude: 179.97, latitude: 40 };
/** Synthetic immutable launch frames isolate renderer math from application selectable-ID rules. */
function frame(id: number, yieldMt: number, point = origin, progress = 1): LaunchFrame {
  return { launch: { id, deviceId: "custom", yieldMt, route: { start: point, control: point, target: point }, launchedAtMs: 0, flightMs: 6500, blastMs: 4600, radii: blastRadiiForYield(yieldMt) }, elapsedMs: 6500 + 4600 * progress };
}
function compose(frames: readonly LaunchFrame[], points: readonly GeoPoint[]): MultiFieldWorkState {
  const work = createMultiFieldWork(frames, { width: points.length, height: 1, longitudes: Float64Array.from(points, (p) => p.longitude), latitudes: Float64Array.from(points, (p) => p.latitude), center: null, farthestFromCenterKm: Infinity });
  while (!advanceMultiFieldWork(work, MULTI_FIELD_WORK_CHUNK, 1024).complete) { /* bounded continuation */ }
  return work;
}
function color(work: MultiFieldWorkState, index: number) {
  const offset = index * 4;
  return composedBlastColor(work.peak[index]!, work.sum[index]!, { red: work.baseColors[offset]!, green: work.baseColors[offset + 1]!, blue: work.baseColors[offset + 2]!, alpha: work.baseColors[offset + 3]! });
}

describe("Blast mode RGBA identity", () => {
  it.each(DEVICES.map((device) => [device.id, device.warheadYieldMt ?? device.yieldMt] as const))("preserves %s interior bands and expanding feather in a single-contribution multi field", (_id, yieldMt) => {
    for (const progress of [.08, .4, 1]) {
      const strike = frame(1, yieldMt, origin, progress);
      const radii = strike.launch.radii;
      const travelled = radii.light * blastExpansion(progress);
      const points = [0, .2, .52, .75, 1, 1.1, 1.23, 1.25].map((fraction) => destinationPoint(origin, travelled * fraction, 90));
      const work = compose([strike], points);
      const sample = createBlastFieldSampler(radii);
      points.forEach((point, index) => {
        // Both paths cache distance in Float32 km; comparison is exact RGBA bytes.
        const expected = sample(Math.fround(surfaceDistanceKm(origin, point)), travelled);
        expect(color(work, index)).toEqual({ red: expected.red, green: expected.green, blue: expected.blue, alpha: Math.round(expected.alpha * 255) });
      });
    }
  });

  it("matches the correct single-reference anchor colors in normalized overlap coordinates", () => {
    const radii = blastRadiiForYield(.021);
    for (const [distance, intensity] of [[0, 1], [radii.fireball * .52, .9376], [radii.fireball, .88], [radii.severe, .58], [radii.moderate, .34], [radii.light, .14]]) {
      const single = blastColor(distance!, radii);
      expect(multiBlastColor(intensity!)).toEqual({ ...single, alpha: Math.round(single.alpha * 255) });
    }
  });

  it("retains isolated portions of two fields exactly and warms only their shared geographic region", () => {
    const a = frame(1, .021);
    const b = frame(2, .021, destinationPoint(origin, a.launch.radii.light * 1.1, 90));
    const points = [destinationPoint(origin, a.launch.radii.light * .5, 270), destinationPoint(origin, a.launch.radii.light * .55, 90), destinationPoint(b.launch.route.target, a.launch.radii.light * .5, 90)];
    const combined = compose([a, b], points), first = compose([a], points), second = compose([b], points);
    expect(color(combined, 0)).toEqual(color(first, 0)); expect(color(combined, 2)).toEqual(color(second, 2));
    const overlap = color(combined, 1), isolated = color(first, 1);
    expect(overlap.red - overlap.blue).toBeGreaterThan(isolated.red - isolated.blue);
    expect(overlap.alpha).toBeGreaterThanOrEqual(isolated.alpha);
    expect(a.launch.radii).toEqual(blastRadiiForYield(.021));
  });

  it("writes allocation-free compositor samples within one byte of exact overlap interpolation", () => {
    const base = new Uint8ClampedArray([93, 59, 169, 92]);
    for (let peak = .001; peak <= 1; peak += .013) for (const count of [1, 2, 5, 20, 1000]) {
      const target = new Uint8ClampedArray(4);
      writeComposedBlastSample(target, 0, peak, peak * count, base);
      const exact = composedBlastColor(peak, peak * count, { red: 93, green: 59, blue: 169, alpha: 92 });
      Object.values(exact).forEach((channel, index) => expect(Math.abs(target[index]! - channel)).toBeLessThanOrEqual(1));
    }
  });

  it("composes dense overlap independent of launch order with bounded channels and fixed memory", () => {
    const frames = Array.from({ length: 1000 }, (_, index) => frame(index + 1, index % 2 ? .021 : .015, destinationPoint(origin, index % 5 * .1, index % 360)));
    const points = [origin, destinationPoint(origin, 1, 80), destinationPoint(origin, 4, 100), { longitude: NaN, latitude: 0 }];
    const forward = compose(frames, points), reverse = compose([...frames].reverse(), points);
    for (let index = 0; index < points.length; index++) {
      expect(color(forward, index)).toEqual(color(reverse, index));
      for (const channel of Object.values(color(forward, index))) { expect(channel).toBeGreaterThanOrEqual(0); expect(channel).toBeLessThanOrEqual(255); }
    }
    expect(color(forward, 3).alpha).toBe(0);
    expect(forward.baseColors.byteLength + forward.peak.byteLength + forward.sum.byteLength).toBe(points.length * 12);
  });
});
