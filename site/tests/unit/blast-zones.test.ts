/** Blast-zone tests verify non-overlapping physical spans and stable spherical areas at representative yields. */
import { describe, expect, it } from "vitest";
import { blastRadiiForYield } from "../../src/domain/blast";
import { blastZones, sphericalCapAreaKm2 } from "../../src/domain/blastZones";

describe("blast-zone model", () => {
  it("partitions a 21 kt blast into four annuli whose areas sum to its light radius", () => {
    const radii = blastRadiiForYield(0.021);
    const zones = blastZones(radii);
    expect(zones.map((zone) => zone.id)).toEqual(["fireball", "severe", "moderate", "light"]);
    expect(zones[0]!.innerKm).toBe(0);
    for (let index = 1; index < zones.length; index++) expect(zones[index]!.innerKm).toBe(zones[index - 1]!.outerKm);
    // 1e-8 km² covers floating-point subtraction, far below displayed precision.
    expect(Math.abs(zones.reduce((sum, zone) => sum + zone.areaKm2, 0) - sphericalCapAreaKm2(radii.light))).toBeLessThan(1e-8);
    // The screenshot rounds the light annulus to 105.5 km²; 0.2 accommodates displayed rounding.
    expect(Math.abs(zones[3]!.areaKm2 - 105.5)).toBeLessThan(0.2);
  });

  it("keeps areas finite and nonnegative from a tiny custom yield to the Earth-surface limit", () => {
    for (const yieldMt of [1e-9, 0.021, 50, 1e9]) {
      for (const zone of blastZones(blastRadiiForYield(yieldMt))) {
        expect(Number.isFinite(zone.areaKm2)).toBe(true);
        expect(zone.areaKm2).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("rejects invalid spherical radii", () => {
    for (const radius of [-1, NaN, Infinity, 21_000]) expect(() => sphericalCapAreaKm2(radius)).toThrow(RangeError);
  });
});
