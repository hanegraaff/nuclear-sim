/** Application-store tests drive a fake monotonic clock without React or a browser. */
import { describe, expect, it } from "vitest";
import { SimulatorStore, type AnimationClock } from "../../src/application/SimulatorStore";
import type { FlightRoute } from "../../src/application/launch";

const route: FlightRoute = {
  start: { longitude: -74.1, latitude: 40.9 },
  control: { longitude: -73.9, latitude: 40.8 },
  target: { longitude: -73.8, latitude: 40.7 },
};

function fakeClock() {
  let nowMs = 100;
  let nextId = 1;
  const frames = new Map<number, () => void>();
  let cancellations = 0;
  const clock: AnimationClock = {
    now: () => nowMs,
    requestFrame: (callback) => { const id = nextId++; frames.set(id, callback); return id; },
    cancelFrame: (id) => { if (frames.delete(id)) cancellations++; },
  };
  return {
    clock,
    get pending() { return frames.size; },
    get cancellations() { return cancellations; },
    advance: (milliseconds: number) => {
      nowMs += milliseconds;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((frame) => frame());
    },
  };
}

describe("application launch scheduling", () => {
  it("advances one pending frame at a time and cancels the old flight on replacement", () => {
    const time = fakeClock();
    const store = new SimulatorStore(time.clock);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => { notifications++; });
    expect(store.nextLaunchAngle()).toBeCloseTo(-Math.PI / 4, 10);
    store.launchAt(route);
    expect(store.getSnapshot().launch?.deviceId).toBe("fat-man");
    expect(time.pending).toBe(1);
    time.advance(1000);
    expect(store.getSnapshot().elapsedMs).toBe(1000);
    expect(time.pending).toBe(1);
    store.launchAt({ ...route, target: { longitude: -73.7, latitude: 40.6 } });
    expect(store.getSnapshot().launch?.id).toBe(2);
    expect(store.getSnapshot().elapsedMs).toBe(0);
    expect(store.nextLaunchAngle()).not.toBeCloseTo(-Math.PI / 4, 3);
    expect(time.cancellations).toBeGreaterThan(0);
    expect(time.pending).toBe(1);
    unsubscribe();
    expect(time.pending).toBe(0);
    expect(notifications).toBeGreaterThan(2);
  });

  it("does not schedule an invalid custom yield and stops after the blast settles", () => {
    const time = fakeClock();
    const store = new SimulatorStore(time.clock);
    const unsubscribe = store.subscribe(() => {});
    store.dispatch({ type: "selectDevice", id: "custom" });
    store.dispatch({ type: "setCustomYieldInput", value: "0" });
    store.launchAt(route);
    expect(store.getSnapshot().launch).toBeNull();
    expect(time.pending).toBe(0);
    store.dispatch({ type: "setCustomYieldInput", value: "2.5" });
    store.launchAt(route);
    time.advance(9500);
    expect(store.getSnapshot()).toMatchObject({ phase: "detonating", elapsedMs: 9500 });
    expect(time.pending).toBe(1);
    time.advance(1600);
    expect(store.getSnapshot()).toMatchObject({ phase: "complete", elapsedMs: 11100 });
    expect(time.pending).toBe(0);
    unsubscribe();
  });

  it("keeps every multi carrier on one viewport entry bearing while preserving distinct routes", () => {
    const time = fakeClock();
    const store = new SimulatorStore(time.clock);
    store.dispatch({ type: "setMultiLaunch", enabled: true });
    const angle = store.nextLaunchAngle();
    store.launchAt(route);
    store.launchAt({ ...route, target: { longitude: -73.7, latitude: 40.6 } });
    expect(store.nextLaunchAngle()).toBe(angle);
    expect(store.getSnapshot().launchGroups).toHaveLength(2);
    expect(store.getSnapshot().launchGroups[0]?.launches[0]?.route.target).not.toEqual(store.getSnapshot().launchGroups[1]?.launches[0]?.route.target);
    store.dispatch({ type: "reset" });
    expect(store.nextLaunchAngle()).not.toBe(angle);
  });

  it("cancels expansion frames on Reset and preserves the selected device", () => {
    const time = fakeClock();
    const store = new SimulatorStore(time.clock);
    const unsubscribe = store.subscribe(() => {});
    store.dispatch({ type: "selectDevice", id: "moab" });
    store.launchAt(route);
    time.advance(7000);
    expect(store.getSnapshot().phase).toBe("detonating");
    store.dispatch({ type: "reset" });
    expect(store.getSnapshot()).toMatchObject({ phase: "armed", launch: null, elapsedMs: 0, selectedId: "moab" });
    expect(time.pending).toBe(0);
    unsubscribe();
  });
});
