/** Deterministic screening-model tests cover wind bands, geographic reach, and bounded deposition. */
import { describe, expect, it } from "vitest";
import { destinationPoint, geoPoint, surfaceDistanceKm } from "../../src/domain/geodesy";
import { falloutCenterline, falloutDimensions, falloutIntensityAt, falloutZones, modelFallout, prevailingWind } from "../../src/domain/fallout";
import { MAX_SURFACE_DISTANCE_KM } from "../../src/domain/blast";

const NEW_YORK = geoPoint(-73.9857, 40.7484);

describe("H+24 fallout screening model", () => {
  it.each([[0, "EQUATORIAL FLOW", 12], [15, "TRADE WIND", 26], [40, "PREVAILING WESTERLY", 38], [75, "POLAR EASTERLY", 31]])("uses repeatable wind bands at latitude %s", (latitude, band, speed) => {
    const point = geoPoint(0, Number(latitude));
    const wind = prevailingWind(point);
    expect(wind).toEqual(prevailingWind(point));
    expect(wind.band).toBe(band); expect(wind.speedKph).toBe(speed);
    expect(wind.bearing).toBeGreaterThanOrEqual(0); expect(wind.bearing).toBeLessThan(360);
    expect(prevailingWind(geoPoint(40, Number(latitude))).bearing).not.toBe(wind.bearing);
  });

  it("matches the prototype's 42.1 km Fat Man envelope and nested bands", () => {
    const field = modelFallout(NEW_YORK, 0.021);
    // 0.05 km permits the reference screenshot's one-decimal label rounding.
    expect(field.dimensions.lengthKm).toBeCloseTo(42.1, 1);
    expect(field.wind.direction).toBe("E");
    const zones = falloutZones(field.dimensions);
    expect(zones.map((zone) => zone.band.id)).toEqual(["extreme", "high", "elevated", "trace"]);
    zones.forEach((zone, index) => {
      expect(zone.outerKm).toBeGreaterThan(zone.innerKm);
      expect(zone.areaKm2).toBeGreaterThan(0);
      if (index) expect(zone.innerKm).toBe(zones[index - 1]!.outerKm);
    });
  });

  it("preserves geographic geometry across the antimeridian and curves downwind", () => {
    const field = modelFallout(geoPoint(179.98, 40), 0.021);
    const end = falloutCenterline(field, 1);
    expect(end.longitude).toBeLessThan(0);
    expect(surfaceDistanceKm(field.origin, end)).toBeCloseTo(field.dimensions.lengthKm, 7);
    expect(falloutCenterline(field, 0)).toEqual(field.origin);
  });

  it("is bright near ground zero, bounded, and weaker upwind than downwind", () => {
    const field = modelFallout(NEW_YORK, 0.021, 42);
    const downwind = falloutCenterline(field, 0.4);
    const upwind = destinationPoint(field.origin, field.dimensions.lengthKm * 0.4, field.wind.bearing + 180);
    expect(falloutIntensityAt(field, field.origin)).toBe(1);
    expect(falloutIntensityAt(field, downwind)).toBeGreaterThan(0.1);
    expect(falloutIntensityAt(field, upwind)).toBe(0);
    for (let i = 0; i <= 20; i++) expect(falloutIntensityAt(field, falloutCenterline(field, i / 20))).toBeLessThanOrEqual(1);
    expect(modelFallout(NEW_YORK, 0.021, 42)).toEqual(field);
  });

  it("grows monotonically with yield, stays Earth-bounded, and rejects invalid yields", () => {
    const wind = prevailingWind(NEW_YORK);
    const lengths = [1e-9, 0.015, 0.021, 50, 1e9].map((yieldMt) => falloutDimensions(yieldMt, wind).lengthKm);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    expect(lengths.at(-1)).toBeLessThanOrEqual(MAX_SURFACE_DISTANCE_KM);
    for (const invalid of [0, -1, Number.NaN, Infinity]) expect(() => falloutDimensions(invalid, wind)).toThrow(RangeError);
  });
});
