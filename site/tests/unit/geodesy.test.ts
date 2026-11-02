/** Geographic-model invariants for Plan 01; no map or browser is involved. */
import { describe, expect, it } from "vitest";
import { destinationPoint, geoPoint, normalizeLongitude, surfaceDistanceKm } from "../../src/domain/geodesy";

describe("geodesy", () => {
  it("measures a degree at the equator and crosses the antimeridian by the short route", () => {
    expect(surfaceDistanceKm(geoPoint(0, 0), geoPoint(1, 0))).toBeCloseTo(111.195, 2);
    expect(surfaceDistanceKm(geoPoint(179, 0), geoPoint(-179, 0))).toBeCloseTo(222.39, 1);
  });

  it("returns a destination at the requested surface distance for cardinal bearings", () => {
    const origin = geoPoint(-73.9857, 40.7484);
    for (const bearing of [0, 90, 180, 270]) {
      const destination = destinationPoint(origin, 25, bearing);
      expect(surfaceDistanceKm(origin, destination)).toBeCloseTo(25, 7);
    }
  });

  it("normalizes wrapped longitude and rejects invalid coordinates and travel", () => {
    expect(normalizeLongitude(181)).toBe(-179);
    expect(geoPoint(-181, 0).longitude).toBe(179);
    expect(() => geoPoint(0, 91)).toThrow(RangeError);
    expect(() => geoPoint(Number.NaN, 0)).toThrow(RangeError);
    expect(() => destinationPoint(geoPoint(0, 0), -1, 0)).toThrow(RangeError);
    expect(() => destinationPoint(geoPoint(0, 0), 1, Number.NaN)).toThrow(RangeError);
  });
});
