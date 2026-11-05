/** Fake-time MIRV state tests cover one carrier group, staggered impacts, and whole-group retention. */
import { describe, expect, it } from "vitest";
import { getDeviceById } from "../../src/catalog/devices";
import { blastRadiiForYield } from "../../src/domain/blast";
import { surfaceDistanceKm } from "../../src/domain/geodesy";
import { cloudPresentationForState } from "../../src/application/cloudPresentation";
import { FLIGHT_MS, INITIAL_SIMULATOR_STATE, launchFramesForState, reduceSimulator, type FlightRoute } from "../../src/application/launch";

const route: FlightRoute = {
  start: { longitude: -74.2, latitude: 40.9 },
  control: { longitude: -74.1, latitude: 40.8 },
  target: { longitude: -73.9857, latitude: 40.7484 },
};

describe("MIRV click group", () => {
  it.each(["rs-24-yars", "rsm-56-bulava", "rs-28-sarmat"])("uses every %s per-warhead yield and one carrier", (id) => {
    const device = getDeviceById(id)!;
    const launched = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route, deviceId: id, yieldMt: device.yieldMt, nowMs: 100 });
    const group = launched.launchGroups[0]!;
    expect(group.launches).toHaveLength(device.warheadCount!);
    expect(group.launches.map((launch) => launch.yieldMt)).toEqual(Array(device.warheadCount).fill(device.warheadYieldMt));
    expect(group.launches.every((launch) => launch.radii.light === blastRadiiForYield(device.warheadYieldMt!).light)).toBe(true);
    expect(group.launches.every((launch) => launch.mirv?.route === route && launch.mirv.splitMs === FLIGHT_MS * 0.6)).toBe(true);
    expect(group.launches.filter((launch) => launch.mirv?.lead)).toHaveLength(1);
    expect(group.launches.every((launch) => surfaceDistanceKm(route.target, launch.route.target) > 0)).toBe(true);
    expect(launched.nextLaunchId).toBe(device.warheadCount! + 1);
  });

  it("advances successive impacts and cloud rise without waiting for the final warhead", () => {
    const launched = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route, deviceId: "rs-24-yars", yieldMt: 0.525, nowMs: 0 });
    const preSplit = reduceSimulator(launched, { type: "tick", nowMs: 3899, launchId: 3 });
    expect(preSplit.phase).toBe("inbound");
    expect(launchFramesForState(preSplit).filter((frame) => frame.elapsedMs >= frame.launch.flightMs)).toHaveLength(0);
    const firstImpact = reduceSimulator(preSplit, { type: "tick", nowMs: FLIGHT_MS + 20, launchId: 3 });
    expect(firstImpact.phase).toBe("detonating");
    expect(launchFramesForState(firstImpact).filter((frame) => frame.elapsedMs >= frame.launch.flightMs)).toHaveLength(1);
    expect(cloudPresentationForState(firstImpact).progress).toBeGreaterThan(0);
    expect(cloudPresentationForState(firstImpact).qualificationLabel).toContain("PER WARHEAD · 3 RVs");
    const complete = reduceSimulator(firstImpact, { type: "tick", nowMs: FLIGHT_MS + 90 + 4600, launchId: 3 });
    expect(complete.phase).toBe("complete");
    expect(launchFramesForState(complete).filter((frame) => frame.elapsedMs >= frame.launch.flightMs)).toHaveLength(3);
  });

  it("retains all ten impacts when switching from multi to single and cancels them on Reset", () => {
    const multi = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "setMultiLaunch", enabled: true });
    const first = reduceSimulator(multi, { type: "launchAt", route, deviceId: "fat-man", yieldMt: 0.021, nowMs: 0 });
    const second = reduceSimulator(first, { type: "launchAt", route, deviceId: "rsm-56-bulava", yieldMt: 1.2, nowMs: 100 });
    expect(second.launchGroups.map((group) => group.launches.length)).toEqual([1, 10]);
    const single = reduceSimulator(second, { type: "setMultiLaunch", enabled: false });
    expect(single.launchGroups.map((group) => group.launches.length)).toEqual([10]);
    expect(single.launch?.id).toBe(11);
    expect(reduceSimulator(single, { type: "tick", nowMs: 3000, launchId: 1 })).toBe(single);
    expect(reduceSimulator(single, { type: "reset" }).launchGroups).toEqual([]);
  });
});
