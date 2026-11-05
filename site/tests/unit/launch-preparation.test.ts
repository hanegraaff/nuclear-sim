/** Click preparation tests freeze the selected device and geographic MIRV pattern before camera framing. */
import { describe, expect, it } from "vitest";
import { getDeviceById } from "../../src/catalog/devices";
import { prepareLaunch } from "../../src/application/launchPreparation";
import { surfaceDistanceKm } from "../../src/domain/geodesy";

const aim = { longitude: -73.9857, latitude: 40.7484 };

describe("application launch preparation", () => {
  it("freezes three distinct Yars targets in geographic degrees and per-click device identity", () => {
    const prepared = prepareLaunch(getDeviceById("rs-24-yars")!, aim);
    expect(prepared.intent).toEqual({ deviceId: "rs-24-yars", yieldMt: 0.525 });
    expect(prepared.mirvTargets).toHaveLength(3);
    expect(new Set(prepared.mirvTargets!.map((target) => `${target.longitude},${target.latitude}`)).size).toBe(3);
    for (const target of prepared.mirvTargets!) expect(surfaceDistanceKm(aim, target)).toBeGreaterThan(8);
    expect(prepareLaunch(getDeviceById("rs-24-yars")!, aim)).toEqual(prepared);
  });

  it("keeps a single device's click at the selected geographic aim without MIRV targets", () => {
    expect(prepareLaunch(getDeviceById("fat-man")!, aim)).toEqual({
      intent: { deviceId: "fat-man", yieldMt: 0.021 }, mirvTargets: null,
    });
  });
});
