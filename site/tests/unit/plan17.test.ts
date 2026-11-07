/** R-03/R-13: sourced conventional choices and reduced launch timing preserve physical outcomes. */
import { describe, expect, it } from "vitest";
import { DEVICE_GROUPS, getDeviceById } from "../../src/catalog/devices";
import { cloudPresentationForState } from "../../src/application/cloudPresentation";
import { INITIAL_SIMULATOR_STATE, REDUCED_BLAST_MS, REDUCED_FLIGHT_MS, reduceSimulator } from "../../src/application/launch";
const route = { start: { longitude: -74.1, latitude: 40.9 }, control: { longitude: -73.9, latitude: 40.8 }, target: { longitude: -73.8, latitude: 40.7 } };
const ids = ["mk-82", "agm-158-jassm", "gbu-49", "mk-83", "mk-84"];
describe("additional conventional devices", () => {
  for (const id of ids) it(`${id} has a sub-MOAB positive yield and no nuclear fallout or mushroom profile`, () => {
    const device = getDeviceById(id)!;
    expect(DEVICE_GROUPS[0]!.devices).toContain(device);
    expect(device.yieldMt).toBeGreaterThan(0);
    expect(device.yieldMt).toBeLessThan(getDeviceById("moab")!.yieldMt);
    const state = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route, deviceId: id, yieldMt: device.yieldMt, nowMs: 0 });
    expect(state.launch?.fallout).toBeUndefined();
    expect(cloudPresentationForState(state).nuclear).toBe(false);
    expect(state.launch!.radii.fireball).toBeGreaterThan(0);
  });
});
describe("reduced-motion timing", () => {
  it("preserves phase order and physical outcome while finishing sooner", () => {
    const normal = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route, deviceId: "fat-man", yieldMt: 0.021, nowMs: 0 });
    const reduced = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route, deviceId: "fat-man", yieldMt: 0.021, nowMs: 0, reducedMotion: true });
    expect(reduced.launch?.radii).toEqual(normal.launch?.radii);
    expect(reduced.launch?.fallout).toEqual(normal.launch?.fallout);
    expect(cloudPresentationForState(reduced).reducedMotion).toBe(true);
    expect(reduced.phase).toBe("inbound");
    expect(reduced.launch).toMatchObject({ flightMs: REDUCED_FLIGHT_MS, blastMs: REDUCED_BLAST_MS, reducedMotion: true });
    expect(reduceSimulator(reduced, { type: "tick", nowMs: REDUCED_FLIGHT_MS, launchId: 1 }).phase).toBe("detonating");
    expect(reduceSimulator(reduced, { type: "tick", nowMs: REDUCED_FLIGHT_MS + REDUCED_BLAST_MS, launchId: 1 }).phase).toBe("complete");
  });
});
