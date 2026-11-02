/** Plan 04 reducer tests use explicit monotonic milliseconds so flight cancellation is repeatable. */
import { describe, expect, it } from "vitest";
import { INITIAL_SIMULATOR_STATE, reduceSimulator, FLIGHT_MS, type FlightRoute } from "../../src/application/launch";

const firstRoute: FlightRoute = {
  start: { longitude: -74.1, latitude: 40.9 },
  control: { longitude: -73.9, latitude: 40.8 },
  target: { longitude: -73.8, latitude: 40.7 },
};
const secondRoute: FlightRoute = { ...firstRoute, target: { longitude: -73.7, latitude: 40.6 } };

describe("single launch phase and cancellation", () => {
  it("starts a selected device at the clicked geographic target and reaches it after 6.5 seconds", () => {
    const inbound = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route: firstRoute, deviceId: "fat-man", yieldMt: 0.021, nowMs: 100 });
    expect(inbound.phase).toBe("inbound");
    expect(inbound.launch).toMatchObject({ id: 1, route: firstRoute, deviceId: "fat-man", yieldMt: 0.021, flightMs: FLIGHT_MS });
    const midpoint = reduceSimulator(inbound, { type: "tick", nowMs: 3350, launchId: 1 });
    expect(midpoint.elapsedMs).toBe(3250);
    expect(midpoint.phase).toBe("inbound");
    const arrived = reduceSimulator(midpoint, { type: "tick", nowMs: 6600, launchId: 1 });
    expect(arrived.phase).toBe("complete");
    expect(arrived.elapsedMs).toBe(6500);
    expect(reduceSimulator(arrived, { type: "tick", nowMs: 10000, launchId: 1 }).elapsedMs).toBe(9500);
  });

  it("replaces an active flight and ignores its already scheduled frame", () => {
    const first = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route: firstRoute, deviceId: "fat-man", yieldMt: 0.021, nowMs: 100 });
    const second = reduceSimulator(first, { type: "launchAt", route: secondRoute, deviceId: "moab", yieldMt: 0.000011, nowMs: 1200 });
    expect(second.launch?.id).toBe(2);
    expect(second.elapsedMs).toBe(0);
    expect(reduceSimulator(second, { type: "tick", nowMs: 4000, launchId: 1 })).toBe(second);
    expect(reduceSimulator(second, { type: "tick", nowMs: 4100, launchId: 2 }).elapsedMs).toBe(2900);
    expect(reduceSimulator(second, { type: "tick", nowMs: 1000, launchId: 2 })).toBe(second);
  });

  it("clears the flight while preserving selection and ignores an old frame after reset", () => {
    const selected = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "selectDevice", id: "moab" });
    const flight = reduceSimulator(selected, { type: "launchAt", route: firstRoute, deviceId: "moab", yieldMt: 0.000011, nowMs: 500 });
    const reset = reduceSimulator(flight, { type: "reset" });
    expect(reset).toMatchObject({ phase: "armed", launch: null, elapsedMs: 0, selectedId: "moab" });
    expect(reduceSimulator(reset, { type: "tick", nowMs: 3000, launchId: 1 })).toBe(reset);
  });

  it("rejects nonphysical yield and invalid clock values at the action boundary", () => {
    expect(reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route: firstRoute, deviceId: "fat-man", yieldMt: 0, nowMs: 100 })).toBe(INITIAL_SIMULATOR_STATE);
    expect(reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route: firstRoute, deviceId: "fat-man", yieldMt: 1, nowMs: NaN })).toBe(INITIAL_SIMULATOR_STATE);
  });
});
