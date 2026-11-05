/** MIRV model tests check deterministic geographic spread, catalog loadouts, and physical limits. */
import { describe, expect, it } from "vitest";
import { getDeviceById } from "../../src/catalog/devices";
import { blastRadiiForYield } from "../../src/domain/blast";
import { geoPoint, surfaceDistanceKm } from "../../src/domain/geodesy";
import { mirvImpactTargets } from "../../src/domain/mirv";

const aim = geoPoint(-73.9857, 40.7484);

describe("modeled MIRV impact pattern", () => {
  it.each(["rs-24-yars", "rsm-56-bulava", "rs-28-sarmat"])("places every %s warhead at a distinct stable location", (deviceId) => {
    const device = getDeviceById(deviceId)!;
    const targets = mirvImpactTargets(aim, device.warheadCount!, blastRadiiForYield(device.warheadYieldMt!).light);
    expect(targets).toHaveLength(device.warheadCount!);
    expect(mirvImpactTargets(aim, device.warheadCount!, blastRadiiForYield(device.warheadYieldMt!).light)).toEqual(targets);
    expect(new Set(targets.map((point) => `${point.longitude.toFixed(8)},${point.latitude.toFixed(8)}`)).size).toBe(targets.length);
    expect(targets.every((point) => surfaceDistanceKm(aim, point) >= 2 && surfaceDistanceKm(aim, point) < 500)).toBe(true);
  });

  it("keeps targets geographically valid across the antimeridian and near a pole", () => {
    const targets = mirvImpactTargets(geoPoint(179.999, 89.9), 10, 24);
    expect(targets.every((point) => point.longitude >= -180 && point.longitude < 180 && point.latitude <= 90)).toBe(true);
  });

  it("rejects invalid count and radius instead of producing unphysical spread", () => {
    expect(() => mirvImpactTargets(aim, 1, 10)).toThrow(RangeError);
    expect(() => mirvImpactTargets(aim, 3, Number.NaN)).toThrow(RangeError);
    expect(() => mirvImpactTargets(aim, 3, 0)).toThrow(RangeError);
  });
});
