/** Independent-field tests verify bounded, order-independent brightness without yield addition. */
import { describe, expect, it } from "vitest";
import { blastRadiiForYield } from "../../src/domain/blast";
import { blastDamageIntensity, combineBlastIntensities } from "../../src/domain/overlap";

describe("multi-strike damage intensity", () => {
  it("keeps one field unchanged and brightens only where fields overlap", () => {
    expect(combineBlastIntensities([0.34])).toBeCloseTo(0.34, 12);
    expect(combineBlastIntensities([0.34, 0.34])).toBeGreaterThan(0.34);
    expect(combineBlastIntensities([0.34, 0])).toBeCloseTo(0.34, 12);
  });

  it("is commutative, bounded, and saturates without summing weapon yields", () => {
    const fields = [0.14, 0.34, 0.58, 0.88, 0.14];
    const forward = combineBlastIntensities(fields);
    expect(combineBlastIntensities([...fields].reverse())).toBeCloseTo(forward, 12);
    expect(combineBlastIntensities([fields[2]!, fields[0]!, fields[4]!, fields[3]!, fields[1]!])).toBeCloseTo(forward, 12);
    expect(forward).toBeGreaterThan(Math.max(...fields));
    expect(forward).toBeLessThanOrEqual(1);
    expect(combineBlastIntensities(Array(1000).fill(0.2))).toBeLessThanOrEqual(1);
    expect(combineBlastIntensities([])).toBe(0);
  });

  it("tracks one device's nested geographic bands in kilometers", () => {
    const radii = blastRadiiForYield(0.021);
    const readings = [0, radii.fireball, radii.severe, radii.moderate, radii.light].map((distance) => blastDamageIntensity(distance, radii));
    expect(readings[0]).toBe(1);
    for (let index = 1; index < readings.length; index += 1) expect(readings[index]!).toBeLessThan(readings[index - 1]!);
    expect(blastDamageIntensity(radii.light * 1.1, radii)).toBe(0);
  });
});
