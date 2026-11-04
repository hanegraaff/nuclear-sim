/** Cloud presentation tests use reducer ticks to verify selection, MIRV yield, phase, and Reset. */
import { describe, expect, it } from "vitest";
import { cloudPresentationForState } from "../../src/application/cloudPresentation";
import { BLAST_MS, FLIGHT_MS, INITIAL_SIMULATOR_STATE, reduceSimulator, type FlightRoute } from "../../src/application/launch";

const route: FlightRoute = {
  start: { latitude: 40, longitude: -74 },
  control: { latitude: 41, longitude: -73 },
  target: { latitude: 40.7, longitude: -73.9 },
};

describe("cloud instrument timeline", () => {
  it("waits during flight, grows during blast, reaches peak, and returns to standby on Reset", () => {
    const armed = cloudPresentationForState(INITIAL_SIMULATOR_STATE);
    expect(armed).toMatchObject({ heightLabel: "—", phaseLabel: "STANDBY", plumeLabel: "MUSHROOM CLOUD" });
    const launched = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route, deviceId: "fat-man", yieldMt: 0.021, nowMs: 100 });
    const inbound = reduceSimulator(launched, { type: "tick", nowMs: 100 + FLIGHT_MS - 1, launchId: 1 });
    expect(cloudPresentationForState(inbound).progress).toBe(0);
    const growing = reduceSimulator(inbound, { type: "tick", nowMs: 100 + FLIGHT_MS + BLAST_MS / 2, launchId: 1 });
    const midway = cloudPresentationForState(growing);
    expect(midway.progress).toBe(0.5);
    expect(midway.currentHeightKm).toBeGreaterThan(0);
    expect(midway.currentHeightKm).toBeLessThan(midway.peakHeightKm);
    expect(midway.phaseLabel).toBe("CAP FORMATION");
    const complete = reduceSimulator(growing, { type: "tick", nowMs: 100 + FLIGHT_MS + BLAST_MS, launchId: 1 });
    expect(cloudPresentationForState(complete)).toMatchObject({ heightLabel: "12.1 km", phaseLabel: "MODELED PEAK", progress: 1 });
    const reset = reduceSimulator(complete, { type: "reset" });
    expect(cloudPresentationForState(reset)).toMatchObject({ heightLabel: "—", phaseLabel: "STANDBY", progress: 0 });
  });

  it("keeps the launched profile after selection changes and uses one MIRV warhead", () => {
    const armed = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "selectDevice", id: "rs-24-yars" });
    const launched = reduceSimulator(armed, { type: "launchAt", route, deviceId: "rs-24-yars", yieldMt: 0.525, nowMs: 0 });
    const switched = reduceSimulator(launched, { type: "selectDevice", id: "tsar-bomba" });
    const complete = reduceSimulator(switched, { type: "tick", nowMs: FLIGHT_MS + BLAST_MS, launchId: 1 });
    const display = cloudPresentationForState(complete);
    expect(display.qualificationLabel).toBe("PER WARHEAD · 3 RVs");
    expect(display.peakHeightKm).toBeLessThan(25); // 0.175 Mt warhead, not 0.525 Mt aggregate.
    expect(display.plumeLabel).toBe("MUSHROOM CLOUD");
  });

  it("names a conventional plume and its growth phases", () => {
    const launched = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route, deviceId: "moab", yieldMt: 0.000011, nowMs: 0 });
    const growing = reduceSimulator(launched, { type: "tick", nowMs: FLIGHT_MS + BLAST_MS / 4, launchId: 1 });
    expect(cloudPresentationForState(growing)).toMatchObject({ plumeLabel: "DETONATION PLUME", phaseLabel: "SHOCK / DUST RISE", nuclear: false });
  });
});
