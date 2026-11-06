/** Fixed-camera Visible tests check geographic marker projection, shared palette, bounded overlap, and pitched alpha recovery without map tiles. */
import { describe, expect, it } from "vitest";
import { normalizeLongitude, type GeoPoint } from "../../src/domain/geodesy";
import { visibleIntensity, visibleRadiusKm } from "../../src/domain/visible";
import { visibleColor, visibleColorAtDistances, visibleComposite, restoreVisibleMeshAlpha } from "../../src/rendering/effects/visiblePalette";
import { buildVisibleInspection } from "../../src/rendering/overlays/visibleInspection";
import { smoothRangeFeatherAlpha } from "../../src/rendering/effects/audibleReprojection";

/** Local linear fake camera in CSS pixels per surface kilometer. */
function cameraAt(origin: GeoPoint, scale: number, x: number, y: number) {
  const longitudeKm = 111.195 * Math.cos(origin.latitude * Math.PI / 180);
  return { toScreen: (point: GeoPoint) => ({
    x: x + normalizeLongitude(point.longitude - origin.longitude) * longitudeKm * scale,
    y: y - (point.latitude - origin.latitude) * 111.195 * scale,
  }) };
}

describe("Visible geographic rendering", () => {
  it("keeps all four marker locations and the ruler attached through pan, zoom and antimeridian wrapping", () => {
    const origin = { longitude: 179.98, latitude: 40 };
    const radius = visibleRadiusKm(0.503, 0.188);
    const first = buildVisibleInspection(cameraAt(origin, 4, 400, 500) as never, origin, radius, 2000, 1200)!;
    const moved = buildVisibleInspection(cameraAt(origin, 8, 500, 540) as never, origin, radius, 2000, 1200)!;
    expect(first.ruler).toHaveLength(43);
    expect(first.bands).toHaveLength(4);
    first.bands.forEach(({ marker }, index) => {
      expect(moved.bands[index]!.marker.x).toBeCloseTo(500 + (marker.x - 400) * 2, 7);
      expect(moved.bands[index]!.marker.y).toBeCloseTo(540 + (marker.y - 500) * 2, 7);
    });
    expect(buildVisibleInspection({ toScreen: () => ({ x: NaN, y: NaN }) } as never, origin, radius, 2000, 1200)).toBeNull();
  });

  it("interpolates navy through sky blue to ice white and brightens bounded overlap independent of order", () => {
    let previous = visibleColor(0);
    for (let step = 1; step <= 1000; step++) {
      const current = visibleColor(step / 1000);
      // One 8-bit channel step is permitted at continuous color-stop boundaries.
      expect(current[1]).toBeGreaterThanOrEqual(previous[1] - 1);
      expect(current[3]).toBeGreaterThanOrEqual(previous[3] - 1);
      previous = current;
    }
    const faint = visibleIntensity(0.8);
    const one = visibleColorAtDistances([0.8]);
    const two = visibleColorAtDistances([0.8, 0.8]);
    expect(visibleComposite([faint, faint])).toBeGreaterThan(faint);
    expect(two[1]).toBeGreaterThan(one[1]);
    expect(visibleColorAtDistances([0.8, 0.8])).toEqual(visibleColorAtDistances([0.8, 0.8].reverse()));
    expect(visibleComposite(Array(100).fill(0.5))).toBeLessThanOrEqual(1);
  });

  it("recovers the same blue field opacity on either side of an antialiased pitched mesh edge", () => {
    const [red, green, blue, alpha] = visibleColor(0.6);
    const image = { width: 3, height: 1, data: new Uint8ClampedArray([
      red, green, blue, Math.round(alpha * 0.45), red, green, blue, Math.round(alpha * 0.9), 0, 0, 0, 0,
    ]) } as ImageData;
    restoreVisibleMeshAlpha(image);
    // Inverting rounded 8-bit palette channels can differ by a few alpha units.
    expect(image.data[3]).toBeCloseTo(alpha, -1);
    expect(image.data[7]).toBe(image.data[3]);
    expect(image.data[11]).toBe(0);
  });

  it("keeps low-coverage feather pixels faint instead of promoting quantized RGB to blue speckles", () => {
    const [red, green, blue] = visibleColor(0.5);
    const image = { width: 2, height: 1, data: new Uint8ClampedArray([
      red, green, blue, 8, red, green, blue, 23,
    ]) } as ImageData;
    restoreVisibleMeshAlpha(image);
    // At these alpha levels, unpremultiplication quantizes the palette color;
    // preserving coverage avoids isolated opaque pixels on the soft rim.
    expect(image.data[3]).toBe(8);
    expect(image.data[7]).toBe(23);
  });

  it("damps an isolated pitched-warp fringe texel while retaining a broad field interior", () => {
    const image = { width: 5, height: 5, data: new Uint8ClampedArray(5 * 5 * 4) } as ImageData;
    image.data[(2 * 5 + 2) * 4 + 3] = 64;
    smoothRangeFeatherAlpha(image);
    // A single noisy texel receives only one quarter of its former opacity;
    // neighboring texels receive the rest as a soft antialiased fringe.
    expect(image.data[(2 * 5 + 2) * 4 + 3]).toBe(16);
    expect(image.data[(2 * 5 + 1) * 4 + 3]).toBe(8);
    const solid = { width: 5, height: 5, data: new Uint8ClampedArray(5 * 5 * 4) } as ImageData;
    for (let index = 3; index < solid.data.length; index += 4) solid.data[index] = 190;
    smoothRangeFeatherAlpha(solid);
    expect(solid.data[(2 * 5 + 2) * 4 + 3]).toBe(190);
  });
});
