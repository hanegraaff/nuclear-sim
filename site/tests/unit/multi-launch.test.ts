/** Fake-clock multi-launch tests cover group retention, overlapping phases, and Reset invariants. */
import { describe, expect, it } from "vitest";
import { BLAST_MS, FLIGHT_MS, INITIAL_SIMULATOR_STATE, launchFramesForState, reduceSimulator, type FlightRoute } from "../../src/application/launch";

const firstRoute: FlightRoute = {
  start: { longitude: -74.2, latitude: 40.8 },
  control: { longitude: -74.1, latitude: 40.75 },
  target: { longitude: -74, latitude: 40.7 },
};
const secondRoute: FlightRoute = { ...firstRoute, target: { longitude: -73.96, latitude: 40.72 } };

/** Add one deterministic Fat Man click at a monotonic millisecond timestamp. */
function launchAt(state: typeof INITIAL_SIMULATOR_STATE, route: FlightRoute, nowMs: number, flightMs = FLIGHT_MS) {
  return reduceSimulator(state, { type: "launchAt", route, deviceId: "fat-man", yieldMt: 0.021, nowMs, flightMs });
}

describe("multi-launch groups", () => {
  it("appends a new flight while a previous field expands and keeps each target", () => {
    const multi = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "setMultiLaunch", enabled: true });
    const first = launchAt(multi, firstRoute, 100);
    const exploding = reduceSimulator(first, { type: "tick", nowMs: 7100, launchId: 1 });
    const second = launchAt(exploding, secondRoute, 7100);
    expect(second).toMatchObject({ multiLaunch: true, phase: "detonating", launch: { id: 2, route: secondRoute } });
    expect(second.launchGroups.map((group) => group.id)).toEqual([1, 2]);
    expect(launchFramesForState(second)).toMatchObject([
      { launch: { route: firstRoute }, elapsedMs: 7000 },
      { launch: { route: secondRoute }, elapsedMs: 0 },
    ]);
    expect(reduceSimulator(second, { type: "tick", nowMs: 8000, launchId: 1 })).toBe(second);
  });

  it("switches presentation immediately and retains the newest whole delivery group when disabled", () => {
    const first = launchAt(INITIAL_SIMULATOR_STATE, firstRoute, 0);
    const multi = reduceSimulator(first, { type: "setMultiLaunch", enabled: true });
    expect(multi.launchGroups).toHaveLength(1);
    const second = launchAt(multi, secondRoute, 500);
    const lead = second.launch!;
    // Plan 11 can add several warheads to one click; mode-off must keep them together.
    const warhead = { ...lead, id: 3, route: { ...lead.route, target: { longitude: -73.95, latitude: 40.73 } } };
    const grouped = { ...second, launchGroups: [second.launchGroups[0]!, { id: 2, launches: [lead, warhead] }] };
    const single = reduceSimulator(grouped, { type: "setMultiLaunch", enabled: false });
    expect(single.multiLaunch).toBe(false);
    expect(single.launchGroups).toEqual([{ id: 2, launches: [lead, warhead] }]);
    expect(single.launch?.id).toBe(3);
    expect(reduceSimulator(single, { type: "setMultiLaunch", enabled: false })).toBe(single);
  });

  it("continues aging an older long flight after the latest strike reaches its terminal age", () => {
    const multi = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "setMultiLaunch", enabled: true });
    const first = launchAt(multi, firstRoute, 0, 20_000);
    const second = launchAt(first, secondRoute, 1000);
    const latestDone = reduceSimulator(second, { type: "tick", nowMs: 1000 + FLIGHT_MS + BLAST_MS, launchId: 2 });
    expect(latestDone.elapsedMs).toBe(FLIGHT_MS + BLAST_MS);
    expect(latestDone.phase).toBe("inbound");
    const later = reduceSimulator(latestDone, { type: "tick", nowMs: 15_000, launchId: 2 });
    expect(later.nowMs).toBe(15_000);
    expect(later.elapsedMs).toBe(latestDone.elapsedMs);
    expect(launchFramesForState(later)[0]?.elapsedMs).toBe(15_000);
    expect(reduceSimulator(later, { type: "tick", nowMs: 25_000, launchId: 2 }).phase).toBe("complete");
  });

  it("Reset clears all groups but preserves mode and selected device", () => {
    const selected = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "selectDevice", id: "moab" });
    const multi = reduceSimulator(selected, { type: "setMultiLaunch", enabled: true });
    const launched = launchAt(launchAt(multi, firstRoute, 0), secondRoute, 50);
    const reset = reduceSimulator(launched, { type: "reset" });
    expect(reset).toMatchObject({ multiLaunch: true, selectedId: "moab", launchGroups: [], launch: null, phase: "armed", elapsedMs: 0 });
    expect(launchFramesForState(reset)).toEqual([]);
    expect(reduceSimulator(reset, { type: "tick", nowMs: 1000, launchId: 2 })).toBe(reset);
  });
});
