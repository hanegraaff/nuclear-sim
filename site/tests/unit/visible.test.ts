/** Direct-fireball sightline tests cover curvature, the 1.7 m observer, physical bounds, and smooth viewing bands. */
import { describe, expect, it } from "vitest";
import { blastRadiiForYield, MAX_SURFACE_DISTANCE_KM } from "../../src/domain/blast";
import { VISIBLE_BANDS, curvatureHorizonKm, visibleBands, visibleIntensity, visibleRadiusKm } from "../../src/domain/visible";

describe("direct-fireball visible horizon", () => {
  it("matches the prototype Fat Man 98.5 km label and includes the observer eye height", () => {
    const fireballKm = blastRadiiForYield(0.021).fireball;
    const radius = visibleRadiusKm(0.503, fireballKm);
    expect(radius).toBeCloseTo(98.5, 0); // The screenshot rounds a kilometer value to one decimal.
    expect(radius - visibleRadiusKm(0.503, fireballKm, 0)).toBeCloseTo(curvatureHorizonKm(0.0017), 8);
    expect(visibleRadiusKm(0, fireballKm)).toBeLessThan(radius);
  });

  it("rises with luminous height and stays below the antipodal surface limit for extreme catalog yields", () => {
    const yields = [0.000011, 0.021, 0.175, 50, 20_000_000, 1_000_000_000];
    const radii = yields.map((yieldMt) => visibleRadiusKm(0.503, blastRadiiForYield(yieldMt).fireball));
    expect(radii.every((radius, index) => index === 0 || radius >= radii[index - 1]!)).toBe(true);
    expect(radii.at(-1)).toBeLessThanOrEqual(MAX_SURFACE_DISTANCE_KM);
    expect(radii.every(Number.isFinite)).toBe(true);
  });

  it("rejects invalid kilometer inputs before rendering a sightline", () => {
    for (const invalid of [-1, Number.NaN, Infinity]) {
      expect(() => curvatureHorizonKm(invalid)).toThrow(RangeError);
      expect(() => visibleRadiusKm(invalid, 0.2)).toThrow(RangeError);
      expect(() => visibleRadiusKm(0.5, invalid)).toThrow(RangeError);
      expect(() => visibleRadiusKm(0.5, 0.2, invalid)).toThrow(RangeError);
    }
    expect(() => visibleBands(Infinity)).toThrow(RangeError);
  });

  it("partitions the direct horizon into four contiguous spherical bands", () => {
    const radius = visibleRadiusKm(0.503, blastRadiiForYield(0.021).fireball);
    const bands = visibleBands(radius);
    expect(bands.map((band) => band.id)).toEqual(VISIBLE_BANDS.map((band) => band.id));
    expect(bands[0]!.outerKm).toBe(radius);
    expect(bands.at(-1)!.innerKm).toBe(0);
    for (let index = 0; index < bands.length - 1; index++) {
      expect(bands[index]!.innerKm).toBe(bands[index + 1]!.outerKm);
      expect(bands[index]!.areaKm2).toBeGreaterThan(0);
    }
  });

  it("fades continuously through the horizon with a soft 12 percent tail", () => {
    expect(visibleIntensity(0)).toBe(1);
    expect(visibleIntensity(1)).toBeCloseTo(0.04, 8);
    expect(visibleIntensity(1.12)).toBe(0);
    for (let step = 1; step <= 1120; step++) {
      // One-thousandth-radius steps expose any hard band edge in the modeled field.
      expect(visibleIntensity(step / 1000)).toBeLessThanOrEqual(visibleIntensity((step - 1) / 1000) + 1e-12);
    }
  });
});
