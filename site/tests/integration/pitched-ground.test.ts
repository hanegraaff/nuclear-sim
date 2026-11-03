/** Nonlinear fake-camera tests keep the field, rings, ruler, and markers on one geographic ground plane. */
import { describe, expect, it } from "vitest";
import { blastRadiiForYield } from "../../src/domain/blast";
import { geoPoint, normalizeLongitude, type GeoPoint } from "../../src/domain/geodesy";
import { buildBlastDistanceGrid, type BlastDistanceGrid } from "../../src/rendering/effects/blastFieldGeometry";
import { buildBlastInspection } from "../../src/rendering/overlays/blastInspection";

const ORIGIN = geoPoint(-73.9857, 40.7484);
const LATITUDE_KM_PER_DEGREE = 111.195;
const LONGITUDE_KM_PER_DEGREE = LATITUDE_KM_PER_DEGREE * Math.cos(ORIGIN.latitude * Math.PI / 180);
const PERSPECTIVE = 0.012;

/** Reversible local camera with perspective-compressed north and stretched south. */
function groundCamera(centerX: number, centerY: number, pixelsPerKm: number, pitched: boolean) {
  return {
    toScreen(point: GeoPoint) {
      const eastKm = normalizeLongitude(point.longitude - ORIGIN.longitude) * LONGITUDE_KM_PER_DEGREE;
      const northKm = (point.latitude - ORIGIN.latitude) * LATITUDE_KM_PER_DEGREE;
      return {
        x: centerX + eastKm * pixelsPerKm,
        y: centerY - northKm * pixelsPerKm / (1 + (pitched ? PERSPECTIVE * northKm : 0)),
      };
    },
    toGeo(point: { readonly x: number; readonly y: number }) {
      const eastKm = (point.x - centerX) / pixelsPerKm;
      const projectedNorthKm = (centerY - point.y) / pixelsPerKm;
      const northKm = projectedNorthKm / (1 - (pitched ? PERSPECTIVE * projectedNorthKm : 0));
      return geoPoint(ORIGIN.longitude + eastKm / LONGITUDE_KM_PER_DEGREE, ORIGIN.latitude + northKm / LATITUDE_KM_PER_DEGREE);
    },
  };
}

/** Read the nearest geodesic mask sample; the 0.25 km tolerance covers at most one 2.4 px sample at 20 px/km. */
function sampledDistance(grid: BlastDistanceGrid, point: { readonly x: number; readonly y: number }): number {
  const x = Math.min(grid.width - 1, Math.max(0, Math.floor(point.x * grid.scale)));
  const y = Math.min(grid.height - 1, Math.max(0, Math.floor(point.y * grid.scale)));
  return grid.distancesKm[y * grid.width + x]!;
}

describe("pitched blast ground projection", () => {
  const radii = blastRadiiForYield(0.021);

  it("keeps every marker midpoint on the same geographic field in top-down and pitched cameras", () => {
    for (const pitched of [false, true]) {
      const camera = groundCamera(400, 300, 20, pitched);
      const field = buildBlastDistanceGrid(camera, ORIGIN, 800, 600);
      const inspection = buildBlastInspection(camera, ORIGIN, radii, 800, 600, 54)!;
      for (const projected of inspection.zones) {
        const midpointKm = (projected.zone.innerKm + projected.zone.outerKm) / 2;
        expect(Math.abs(sampledDistance(field, projected.marker) - midpointKm)).toBeLessThan(0.25);
      }
      const north = inspection.zones.at(-1)!.ring[0]!;
      const south = inspection.zones.at(-1)!.ring[60]!;
      if (pitched) expect(300 - north.y).toBeLessThan(south.y - 300);
      else expect(Math.abs((300 - north.y) - (south.y - 300))).toBeLessThan(0.5);
    }
  });

  it("reprojects the field and marker together after pan, zoom, and resize", () => {
    const firstCamera = groundCamera(400, 300, 20, true);
    const movedCamera = groundCamera(500, 340, 30, true);
    const first = buildBlastInspection(firstCamera, ORIGIN, radii, 800, 600, 54)!;
    const moved = buildBlastInspection(movedCamera, ORIGIN, radii, 900, 650, 54)!;
    const field = buildBlastDistanceGrid(movedCamera, ORIGIN, 900, 650);
    const firstLight = first.zones.find((zone) => zone.zone.id === "light")!;
    const movedLight = moved.zones.find((zone) => zone.zone.id === "light")!;
    expect(movedLight.marker.x - 500).toBeGreaterThan((firstLight.marker.x - 400) * 1.45);
    expect(Math.abs(sampledDistance(field, movedLight.marker) - (movedLight.zone.innerKm + movedLight.zone.outerKm) / 2)).toBeLessThan(0.25);
    expect(moved.width).toBe(900);
    expect(moved.height).toBe(650);
  });
});
