/** Blast model tests compare prototype 10 kt constants and assert nested monotonic kilometer radii. */
import { describe, expect, it } from "vitest";
import { blastRadiiForYield, MAX_SURFACE_DISTANCE_KM } from "../../src/domain/blast";

describe("single-impact blast radius model", () => {
  it("matches the prototype's 10 kt reference radii in kilometers", () => {
    expect(blastRadiiForYield(0.01)).toEqual({ fireball: 0.14, severe: 0.8, moderate: 1.6, light: 4.8 });
    // The 0.02 km tolerance reflects the rounded 6.15 km label in Nuke Blast Top.png.
    expect(Math.abs(blastRadiiForYield(0.021).light - 6.15)).toBeLessThan(0.02);
  });

  it("keeps every zone nested and nondecreasing across the supported yield range", () => {
    const yields = [1e-9, 0.000011, 0.01, 0.021, 0.5, 50, 1000, 1e9];
    let prior = blastRadiiForYield(yields[0]!);
    for (const yieldMt of yields) {
      const radii = blastRadiiForYield(yieldMt);
      expect(radii.fireball).toBeLessThanOrEqual(radii.severe);
      expect(radii.severe).toBeLessThanOrEqual(radii.moderate);
      expect(radii.moderate).toBeLessThanOrEqual(radii.light);
      expect(radii.light).toBeLessThanOrEqual(MAX_SURFACE_DISTANCE_KM);
      for (const zone of ["fireball", "severe", "moderate", "light"] as const) expect(radii[zone]).toBeGreaterThanOrEqual(prior[zone]);
      prior = radii;
    }
  });

  it("rejects nonphysical or nonfinite yields", () => {
    for (const yieldMt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => blastRadiiForYield(yieldMt)).toThrow(RangeError);
  });
});
