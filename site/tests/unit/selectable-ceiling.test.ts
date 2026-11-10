/** R-03/R-04: product input and commands share the inclusive 1.5 Tt limit; pure-model limits stay independent. */
import { describe, expect, it } from "vitest";
import { DEVICES } from "../../src/catalog/devices";
import { MAX_SELECTABLE_YIELD_MT } from "../../src/catalog/selectableYield";
import { INITIAL_DEVICE_SELECTION, parseCustomYieldMt, reduceDeviceSelection } from "../../src/application/deviceSelection";
import { INITIAL_SCENARIO_SELECTION, reduceScenarioSelection } from "../../src/application/scenarioSelection";
import { prepareLaunch } from "../../src/application/launchPreparation";
import { INITIAL_SIMULATOR_STATE, reduceSimulator } from "../../src/application/launch";

const aim = { longitude: -74, latitude: 40 };
const route = { start: aim, control: aim, target: aim };
const retiredDevices = ["large-continent", "hemisphere-scale", "earth-spanning"];
const retiredScenarios = ["africa-continent", "asia-continent", "point-nemo-hemisphere", "earth-thought-experiment"];

describe("selectable yield ceiling", () => {
  it("keeps every fixed device within the same inclusive ceiling as grouped custom input", () => {
    expect(DEVICES).toHaveLength(49);
    expect(Math.max(...DEVICES.map((d) => d.yieldMt))).toBe(MAX_SELECTABLE_YIELD_MT);
    for (const text of ["1500000", "1,500,000", "1_500_000", "1 500 000", "1.5e6"]) {
      expect(parseCustomYieldMt(text)).toEqual({ valid: true, yieldMt: MAX_SELECTABLE_YIELD_MT });
    }
    for (const text of ["1500000.0001", "1,500,001", "1_500,000", "1 50 000", "1e9"]) expect(parseCustomYieldMt(text).valid).toBe(false);
  });

  it("rejects retired device and scenario IDs before selection or camera state can change", () => {
    for (const id of retiredDevices) expect(() => reduceDeviceSelection(INITIAL_DEVICE_SELECTION, { type: "selectDevice", id })).toThrow(RangeError);
    for (const id of retiredScenarios) expect(() => reduceScenarioSelection(INITIAL_SCENARIO_SELECTION, { type: "selectScenario", id })).toThrow(RangeError);
    expect(INITIAL_SCENARIO_SELECTION.cameraRequest).toBeNull();
  });

  it("blocks forged above-ceiling and retired launch intents without allocating IDs or resetting the scene", () => {
    for (const [deviceId, yieldMt] of [...retiredDevices.map((id) => [id, 1] as const), ["custom", MAX_SELECTABLE_YIELD_MT + .001], ["fat-man", 1e9]] as const) {
      expect(reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route, deviceId, yieldMt, nowMs: 1 })).toBe(INITIAL_SIMULATOR_STATE);
      expect(() => prepareLaunch({ id: deviceId, name: "Forged", displayYield: "", yieldMt }, aim)).toThrow(RangeError);
    }
    const prepared = prepareLaunch({ id: "custom", name: "Custom", displayYield: "1.5 Tt", yieldMt: MAX_SELECTABLE_YIELD_MT }, aim);
    expect(prepared.intent.yieldMt).toBe(MAX_SELECTABLE_YIELD_MT);
    const launch = reduceSimulator(INITIAL_SIMULATOR_STATE, { type: "launchAt", route, ...prepared.intent, nowMs: 1 });
    expect(launch.launch?.yieldMt).toBe(MAX_SELECTABLE_YIELD_MT);
  });
});
