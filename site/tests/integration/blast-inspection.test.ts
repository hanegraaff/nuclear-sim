/** Fake-camera tests verify that rings and markers follow geographic distance through camera changes. */
import { describe, expect, it } from "vitest";
import { blastRadiiForYield } from "../../src/domain/blast";
import { geoPoint, normalizeLongitude, type GeoPoint } from "../../src/domain/geodesy";
import { buildBlastInspection, type InspectionCamera } from "../../src/rendering/overlays/blastInspection";

/** Equirectangular fake centered on an impact; scale and offset stand in for pan and zoom. */
function cameraAt(origin: GeoPoint, pixelsPerKm: number, centerX: number, centerY: number): InspectionCamera {
  const latitudeScale = Math.cos(origin.latitude * Math.PI / 180) * 111.195;
  return { toScreen: (point) => ({
    x: centerX + normalizeLongitude(point.longitude - origin.longitude) * latitudeScale * pixelsPerKm,
    y: centerY - (point.latitude - origin.latitude) * 111.195 * pixelsPerKm,
  }) };
}

describe("blast inspection projection", () => {
  const origin = geoPoint(-73.9857, 40.7484);
  const radii = blastRadiiForYield(0.021);

  it("projects four ring boundaries and marker midpoints at the current map scale", () => {
    const geometry = buildBlastInspection(cameraAt(origin, 40, 900, 550), origin, radii, 1508, 1080)!;
    expect(geometry.zones).toHaveLength(4);
    expect(geometry.zones.every((zone) => zone.ring.length === 120)).toBe(true);
    expect(geometry.zones.every((zone) => zone.visible)).toBe(true);
    const light = geometry.zones.find((zone) => zone.zone.id === "light")!;
    const projectedKm = Math.hypot(light.rulerPoint.x - 900, light.rulerPoint.y - 550) / 40;
    // Local equirectangular projection differs from the geodesic by <0.01 km at 6 km.
    expect(Math.abs(projectedKm - (light.zone.innerKm + light.zone.outerKm) / 2)).toBeLessThan(0.01);
  });

  it("moves markers with pan and scales their distance from ground zero with zoom", () => {
    const first = buildBlastInspection(cameraAt(origin, 25, 800, 500), origin, radii, 1508, 1080)!;
    const panned = buildBlastInspection(cameraAt(origin, 25, 900, 570), origin, radii, 1508, 1080)!;
    const zoomed = buildBlastInspection(cameraAt(origin, 50, 800, 500), origin, radii, 1508, 1080)!;
    for (let index = 0; index < 4; index++) {
      const a = first.zones[index]!.rulerPoint;
      const b = panned.zones[index]!.rulerPoint;
      const c = zoomed.zones[index]!.rulerPoint;
      // A changed quadrant can alter positions; the test viewport keeps northeast available.
      expect(Math.abs((b.x - a.x) - 100)).toBeLessThan(0.5);
      expect(Math.abs((b.y - a.y) - 70)).toBeLessThan(0.5);
      expect(Math.abs(Math.hypot(c.x - 800, c.y - 500) / Math.hypot(a.x - 800, a.y - 500) - 2)).toBeLessThan(0.01);
    }
  });

  it("keeps the marker line continuous across the antimeridian", () => {
    const island = geoPoint(179.98, 0);
    const geometry = buildBlastInspection(cameraAt(island, 20, 500, 400), island, radii, 1000, 800)!;
    expect(geometry.ruler.every((point) => Number.isFinite(point.x) && point.x > 0 && point.x < 1000)).toBe(true);
  });
});
