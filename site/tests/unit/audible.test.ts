/** Audible model tests cover bounded monotone reach, smooth falloff, and physical inspection spans without live weather. */
import { describe, expect, it } from "vitest";
import { AUDIBLE_BANDS, audibleBands, audibleIntensity, audibleRadiusKm } from "../../src/domain/audible";
import { MAX_SURFACE_DISTANCE_KM } from "../../src/domain/blast";

describe("outdoor audible range", () => {
  it("increases with per-warhead yield and remains bounded at extreme yields", () => {
    const yields = [0.000011, 0.015, 0.021, 0.175, 50, 1_000_000_000];
    const radii = yields.map((yieldMt) => audibleRadiusKm(yieldMt));
    expect(radii.every((radius, index) => index === 0 || radius >= radii[index - 1]!)).toBe(true);
    expect(radii.at(-1)).toBe(MAX_SURFACE_DISTANCE_KM);
    // The prototype's 155 × yield^0.32 calibration gives Fat Man roughly 45 km.
    expect(audibleRadiusKm(0.021)).toBeCloseTo(45.02, 0);
    expect(audibleRadiusKm(0.175)).toBeLessThan(audibleRadiusKm(0.525));
    expect(audibleRadiusKm(0.021, 10)).toBeGreaterThan(audibleRadiusKm(0.021, 0));
  });

  it("rejects invalid physical input instead of drawing misleading ranges", () => {
    for (const yieldMt of [0, -1, Number.NaN, Infinity]) expect(() => audibleRadiusKm(yieldMt)).toThrow(RangeError);
    expect(() => audibleRadiusKm(0.021, -1)).toThrow(RangeError);
    expect(() => audibleBands(Infinity)).toThrow(RangeError);
  });

  it("uses the prototype's four nested hearing experiences without gaps", () => {
    const radius = audibleRadiusKm(0.021);
    const bands = audibleBands(radius);
    expect(bands.map((band) => band.id)).toEqual(AUDIBLE_BANDS.map((band) => band.id));
    expect(bands.at(-1)!.innerKm).toBe(0);
    expect(bands[0]!.outerKm).toBe(radius);
    for (let index = 0; index < bands.length - 1; index++) {
      // Both annuli derive from the same radius and prototype fractions; exact equality is expected.
      expect(bands[index]!.innerKm).toBe(bands[index + 1]!.outerKm);
      expect(bands[index]!.areaKm2).toBeGreaterThan(0);
    }
  });

  it("fades continuously through each stop and past the nominal radius", () => {
    expect(audibleIntensity(0)).toBe(1);
    expect(audibleIntensity(1)).toBeCloseTo(0.04, 8);
    expect(audibleIntensity(1.12)).toBe(0);
    for (let step = 1; step <= 1120; step++) {
      // One-thousandth-radius samples catch abrupt visible band boundaries.
      expect(audibleIntensity(step / 1000)).toBeLessThanOrEqual(audibleIntensity((step - 1) / 1000) + 1e-12);
    }
  });
});
