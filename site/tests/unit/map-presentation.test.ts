/** Pure presentation-state tests verify Night and Hide never mutate geographic strike or view data. */
import { describe, expect, it } from "vitest";
import { INITIAL_SIMULATOR_STATE, reduceSimulator } from "../../src/application/launch";

const route = { start: { longitude: -74.4, latitude: 41 }, control: { longitude: -74.2, latitude: 40.9 }, target: { longitude: -73.9857, latitude: 40.7484 } };

describe("map tone and panel visibility", () => {
  it("defaults to day with both left panels visible and ignores repeated selections", () => {
    expect(INITIAL_SIMULATOR_STATE.mapTone).toBe("day");
    expect(INITIAL_SIMULATOR_STATE.panelsVisible).toBe(true);
    expect(reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "setMapTone", tone: "day" })).toBe(INITIAL_SIMULATOR_STATE);
    expect(reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "setPanelsVisible", visible: true })).toBe(INITIAL_SIMULATOR_STATE);
  });

  it("keeps the same strike, effect selection and phase through Night, Hide, Show and Reset", () => {
    const launched = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route, deviceId: "fat-man", yieldMt: 0.021, nowMs: 0 });
    const settled = reduceSimulator(launched, { type: "tick", launchId: launched.launch!.id, nowMs: 12_000 });
    const visible = reduceSimulator(settled, { type: "setEffectView", view: "visible" });
    const pinned = reduceSimulator(visible, { type: "pinVisible", id: "brilliant" });
    const night = reduceSimulator(pinned, { type: "setMapTone", tone: "night" });
    const hidden = reduceSimulator(night, { type: "setPanelsVisible", visible: false });
    expect(hidden).toMatchObject({ phase: "complete", effectView: "visible", mapTone: "night", panelsVisible: false, activeVisibleId: "brilliant" });
    expect(hidden.launchGroups).toBe(pinned.launchGroups);
    expect(hidden.launch).toBe(pinned.launch);
    const restored = reduceSimulator(hidden, { type: "setPanelsVisible", visible: true });
    expect(restored.launchGroups).toBe(pinned.launchGroups);
    expect(restored.mapTone).toBe("night");
    const reset = reduceSimulator(hidden, { type: "reset" });
    expect(reset).toMatchObject({ phase: "armed", mapTone: "night", panelsVisible: false, launchGroups: [] });
  });
});
