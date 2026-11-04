/** Cloud model tests pin prototype Fat Man scale, finite extremes, and monotone normalized rise. */
import { describe, expect, it } from "vitest";
import { cloudGrowthAt, cloudPeakForProfile } from "../../src/domain/cloud";

describe("cloud height model", () => {
  it("puts the 21 kt Fat Man cloud near the prototype's 12.1 km readout", () => {
    const peak = cloudPeakForProfile({ nuclear: true, warheadYieldMt: 0.021, burstHeightKm: 0.503 });
    // 0.1 km is the precision of the screenshot readout, not measured uncertainty.
    expect(peak.heightKm).toBeCloseTo(12.13, 1);
    expect(peak.orbitalScale).toBe(false);
  });

  it("bounds conventional and extreme nuclear profiles at finite nonnegative heights", () => {
    const conventional = cloudPeakForProfile({ nuclear: false, warheadYieldMt: 0.000011, burstHeightKm: 0.003 });
    const extreme = cloudPeakForProfile({ nuclear: true, warheadYieldMt: 1_000_000_000, burstHeightKm: 12 });
    expect(conventional.heightKm).toBeGreaterThan(0.1);
    expect(conventional.heightKm).toBeLessThan(1);
    expect(extreme.heightKm).toBeLessThanOrEqual(1_000_000);
    expect(extreme.orbitalScale).toBe(true);
  });

  it("rejects invalid model inputs", () => {
    expect(() => cloudPeakForProfile({ nuclear: true, warheadYieldMt: 0, burstHeightKm: 0 })).toThrow(RangeError);
    expect(() => cloudPeakForProfile({ nuclear: true, warheadYieldMt: 0.021, burstHeightKm: -1 })).toThrow(RangeError);
    expect(() => cloudGrowthAt(Number.NaN)).toThrow(RangeError);
  });

  it("rises monotonically from zero to its peak over the normalized blast clock", () => {
    const samples = Array.from({ length: 101 }, (_, index) => cloudGrowthAt(index / 100));
    expect(samples[0]).toBe(0);
    expect(samples[100]).toBe(1);
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]!).toBeGreaterThanOrEqual(samples[index - 1]!);
      expect(samples[index]!).toBeLessThanOrEqual(1);
    }
    expect(cloudGrowthAt(-2)).toBe(0);
    expect(cloudGrowthAt(2)).toBe(1);
  });
});
