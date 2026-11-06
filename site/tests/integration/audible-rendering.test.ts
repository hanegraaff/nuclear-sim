/** Deterministic hearing-field tests verify one shared map/legend palette and geographic projection without map tiles. */
import { describe, expect, it } from "vitest";
import { audibleIntensity, audibleRadiusKm } from "../../src/domain/audible";
import { normalizeLongitude, type GeoPoint } from "../../src/domain/geodesy";
import { audibleColor, audibleColorAtDistances, audibleComposite } from "../../src/rendering/effects/audiblePalette";
import { buildAudibleInspection } from "../../src/rendering/overlays/audibleInspection";

function cameraAt(origin: GeoPoint, scale: number, x: number, y: number) {
  const longitudeKm = 111.195 * Math.cos(origin.latitude * Math.PI / 180);
  return { toScreen: (point: GeoPoint) => ({
    x: x + normalizeLongitude(point.longitude - origin.longitude) * longitudeKm * scale,
    y: y - (point.latitude - origin.latitude) * 111.195 * scale,
  }) };
}

describe("Audible geographic rendering", () => {
  it("projects all four markers and ruler with pan and zoom including antimeridian wrapping", () => {
    const origin = { longitude: 179.98, latitude: 40 };
    const radius = audibleRadiusKm(0.021);
    const first = buildAudibleInspection(cameraAt(origin, 8, 400, 500) as never, origin, radius, 2000, 1200)!;
    const moved = buildAudibleInspection(cameraAt(origin, 16, 500, 540) as never, origin, radius, 2000, 1200)!;
    expect(first.ruler).toHaveLength(43);
    expect(first.bands).toHaveLength(4);
    first.bands.forEach(({ marker }, index) => {
      expect(moved.bands[index]!.marker.x).toBeCloseTo(500 + (marker.x - 400) * 2, 7);
      expect(moved.bands[index]!.marker.y).toBeCloseTo(540 + (marker.y - 500) * 2, 7);
    });
    expect(buildAudibleInspection({ toScreen: () => ({ x: NaN, y: NaN }) } as never, origin, radius, 2000, 1200)).toBeNull();
  });

  it("keeps palette channels smooth and makes overlap greener and brighter without changing ranges", () => {
    let previous = audibleColor(0);
    for (let step = 1; step <= 1000; step++) {
      const current = audibleColor(step / 1000);
      // Eight-bit channel rounding permits one unit of local interpolation noise.
      expect(current[1]).toBeGreaterThanOrEqual(previous[1] - 1);
      expect(current[3]).toBeGreaterThanOrEqual(previous[3] - 1);
      previous = current;
    }
    const faint = audibleIntensity(0.8);
    const one = audibleColorAtDistances([0.8]);
    const two = audibleColorAtDistances([0.8, 0.8]);
    expect(audibleComposite([faint, faint])).toBeGreaterThan(faint);
    expect(two[1]).toBeGreaterThan(one[1]);
    expect(audibleColorAtDistances([0.8, 0.8])).toEqual(audibleColorAtDistances([0.8, 0.8].reverse()));
    expect(audibleComposite(Array(100).fill(0.5))).toBeLessThanOrEqual(1);
  });
});
