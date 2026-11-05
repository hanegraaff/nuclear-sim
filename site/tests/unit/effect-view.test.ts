/** Fake-time state tests keep view eligibility tied to retained nuclear deliveries, not selection. */
import { describe, expect, it } from "vitest";
import { falloutAvailable, INITIAL_SIMULATOR_STATE, reduceSimulator, type SimulatorState } from "../../src/application/launch";
import { falloutCameraFrame, falloutLegendForFrames } from "../../src/application/effectPresentation";
import { falloutZones } from "../../src/domain/fallout";
import { launchFramesForState } from "../../src/application/launch";

const route = { start: { longitude: -74.4, latitude: 41 }, control: { longitude: -74.2, latitude: 40.9 }, target: { longitude: -73.9857, latitude: 40.7484 } };
const launch = (state: SimulatorState, deviceId: string, yieldMt: number, time = 0) => reduceSimulator(state, { type: "launchAt", route, deviceId, yieldMt, nowMs: time });
const complete = (state: SimulatorState) => reduceSimulator(state, { type: "tick", nowMs: state.nowMs + 12_000, launchId: state.launch!.id });

describe("settled effect views", () => {
  it("allows Fallout only after a nuclear launch settles and returns new launches to Blast", () => {
    const inbound = launch(INITIAL_SIMULATOR_STATE, "fat-man", 0.021);
    expect(reduceSimulator(inbound, { type: "setEffectView", view: "fallout" })).toBe(inbound);
    const fallout = reduceSimulator(complete(inbound), { type: "setEffectView", view: "fallout" });
    expect(fallout.effectView).toBe("fallout");
    expect(launch(fallout, "fat-man", 0.021, 13_000).effectView).toBe("blast");
    expect(reduceSimulator(fallout, { type: "setPendingLaunch", pending: true }).effectView).toBe("blast");
    expect(reduceSimulator(fallout, { type: "reset" }).effectView).toBe("blast");
  });

  it("ignores conventional-only fields and preserves nuclear eligibility in mixed multi mode", () => {
    const conventional = complete(launch(INITIAL_SIMULATOR_STATE, "moab", 0.000011));
    expect(falloutAvailable(conventional)).toBe(false);
    expect(reduceSimulator(conventional, { type: "setEffectView", view: "fallout" })).toBe(conventional);
    let multi = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "setMultiLaunch", enabled: true });
    multi = launch(multi, "fat-man", 0.021);
    multi = complete(launch(multi, "moab", 0.000011, 100));
    expect(falloutAvailable(multi)).toBe(true);
    const single = reduceSimulator(reduceSimulator(multi, { type: "setEffectView", view: "fallout" }), { type: "setMultiLaunch", enabled: false });
    expect(falloutAvailable(single)).toBe(false); expect(single.effectView).toBe("blast");
  });

  it("models each MIRV footprint at per-warhead yield and frames the retained footprint", () => {
    const state = complete(launch(INITIAL_SIMULATOR_STATE, "rs-24-yars", 0.525));
    const frames = launchFramesForState(state);
    expect(frames).toHaveLength(3);
    expect(frames.every((frame) => frame.launch.fallout?.dimensions.lengthKm === frames[0]!.launch.fallout!.dimensions.lengthKm)).toBe(true);
    const frame = falloutCameraFrame(frames)!;
    expect(frame.horizonKm).toBeGreaterThan(0);
    expect(frame.center.longitude).not.toBe(frames[0]!.launch.route.target.longitude);
  });

  it("derives multi-legend spans outside UI from the newest retained nuclear delivery", () => {
    let multi = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "setMultiLaunch", enabled: true });
    multi = launch(multi, "fat-man", 0.021);
    multi = launch(multi, "b61", 0.05, 100);
    const nuclear = multi.launch!.fallout!;
    multi = complete(launch(multi, "moab", 0.000011, 200));
    expect(falloutLegendForFrames(launchFramesForState(multi))).toEqual(falloutZones(nuclear.dimensions));
    expect(falloutLegendForFrames([])).toEqual([]);
    const conventional = complete(launch(INITIAL_SIMULATOR_STATE, "foab", 0.000044));
    expect(falloutLegendForFrames(launchFramesForState(conventional))).toEqual([]);
  });

  it("clears stale inspection while switching views and supports pointer, focus and pin", () => {
    let state = reduceSimulator(complete(launch(INITIAL_SIMULATOR_STATE, "fat-man", 0.021)), { type: "setEffectView", view: "fallout" });
    state = reduceSimulator(state, { type: "pinFallout", id: "high" });
    expect(state.activeFalloutId).toBe("high");
    state = reduceSimulator(state, { type: "hoverFallout", id: "trace" });
    expect(state.activeFalloutId).toBe("trace");
    state = reduceSimulator(state, { type: "hoverFallout", id: null });
    expect(state.activeFalloutId).toBe("high");
    expect(reduceSimulator(state, { type: "setEffectView", view: "blast" }).pinnedFalloutId).toBeNull();
  });
});
