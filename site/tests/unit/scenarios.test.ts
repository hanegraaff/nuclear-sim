/** R-04: verify every prototype scenario and the independent selection transitions. */
import { describe, expect, it } from "vitest";
import { getDeviceById } from "../../src/catalog/devices";
import { getScenarioById, SCENARIOS } from "../../src/catalog/scenarios";
import { INITIAL_SCENARIO_SELECTION, reduceScenarioSelection } from "../../src/application/scenarioSelection";
import { scenarioHorizonKm } from "../../src/domain/scenarioScale";

// Reference rows from prototype-code/app/page.tsx: kind, ID, label, device, longitude, latitude, and location label.
const reference = [
  ["historical", "hiroshima", "Hiroshima · 1945", "little-boy", 132.4547, 34.3947, "Hiroshima hypocenter"],
  ["historical", "nagasaki", "Nagasaki · 1945", "fat-man", 129.8633, 32.7737, "Nagasaki hypocenter"],
  ["historical", "trinity", "Trinity · New Mexico, 1945", "trinity-gadget", -106.4754, 33.6773, "Trinity Site"],
  ["historical", "sedan", "Sedan · Nevada, 1962", "sedan", -116.0467, 37.1767, "Sedan Crater, Nevada"],
  ["historical", "castle-bravo", "Castle Bravo · Bikini Atoll, 1954", "castle-bravo", 165.27194, 11.69722, "Castle Bravo ground zero"],
  ["historical", "tsar-bomba", "Tsar Bomba · Novaya Zemlya, 1961", "tsar-bomba", 54.5, 73.85, "Tsar Bomba test area"],
  ["historical", "rds-1-semipalatinsk", "RDS-1 · Semipalatinsk, 1949", "rds-1", 77.814, 50.437, "Semipalatinsk Ground Zero"],
  ["historical", "gerboise-reggane", "Gerboise Bleue · Reggane, 1960", "gerboise-bleue", -0.05722, 26.31167, "Gerboise Bleue test area"],
  ["historical", "ivy-mike-elugelab", "Ivy Mike · Elugelab, 1952", "ivy-mike", 162.19477, 11.67023, "Ivy Mike crater"],
  ["historical", "orange-herald-malden", "Orange Herald · Malden Island, 1957", "orange-herald", -154.9, -4.05, "Malden Island test area"],
  ["historical", "canopus-fangataufa", "Canopus · Fangataufa, 1968", "canopus", -138.725009, -22.243336, "Canopus detonation point"],
  ["hypothetical", "tsar-manhattan", "What if: Tsar Bomba over Manhattan?", "tsar-bomba", -73.9857, 40.7484, "Midtown Manhattan"],
  ["hypothetical", "tokyo-100", "What if: 100 Mt over Tokyo?", "city-breaker", 139.6917, 35.6895, "Central Tokyo"],
  ["hypothetical", "europe-continent", "Continent scale · Central Europe", "continent-scale", 8.6821, 50.1109, "Central Europe"],
  ["hypothetical", "north-america-continent", "Continent scale · North America", "continent-scale", -98.4842, 39.0119, "Geographic center of the contiguous US"],
  ["hypothetical", "australia-continent", "Continent scale · Australia", "continent-scale", 134, -25, "Central Australia · illustrative"],
] as const;

describe("scenario catalog parity", () => {
  it("preserves every group, label, device, coordinate and location in prototype order", () => {
    expect(SCENARIOS.map((s) => [s.kind, s.id, s.name, s.deviceId, s.point.longitude, s.point.latitude, s.locationName])).toEqual(reference);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(16);
    for (const scenario of SCENARIOS) {
      expect(getScenarioById(scenario.id)).toBe(scenario);
      expect(getDeviceById(scenario.deviceId)).toBeDefined();
      expect(Math.abs(scenario.point.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(scenario.point.longitude)).toBeLessThanOrEqual(180);
    }
    expect(getScenarioById("missing")).toBeUndefined();
  });
});

describe("scenario selection and scale", () => {
  it.each(reference)("prepares the mapped device and coordinates for %s / %s", (_kind, id, _name, deviceId, longitude, latitude) => {
    const selected = reduceScenarioSelection(INITIAL_SCENARIO_SELECTION, { type: "selectScenario", id });
    expect(selected.selectedId).toBe(deviceId);
    expect(selected.cameraRequest?.center).toEqual({ longitude, latitude });
    expect(selected.cameraRequest!.horizonKm).toBeGreaterThan(0);
  });

  it("selects a device and emits a camera request without launch state", () => {
    const selected = reduceScenarioSelection(INITIAL_SCENARIO_SELECTION, { type: "selectScenario", id: "hiroshima" });
    expect(selected.selectedId).toBe("little-boy");
    expect(selected.scenarioId).toBe("hiroshima");
    expect(selected.cameraRequest).toMatchObject({ sequence: 1, center: { longitude: 132.4547, latitude: 34.3947 } });
    expect(selected.cameraRequest!.horizonKm).toBeCloseTo(5.934, 2);
    expect(selected).not.toHaveProperty("strike");
    expect(reduceScenarioSelection(selected, { type: "selectScenario", id: "hiroshima" }).cameraRequest?.sequence).toBe(2);
    expect(() => reduceScenarioSelection(selected, { type: "selectScenario", id: "missing" })).toThrow(RangeError);
  });

  it("preserves the choice across tabs and clears it when the device is changed", () => {
    const chosen = reduceScenarioSelection(INITIAL_SCENARIO_SELECTION, { type: "selectScenario", id: "trinity" });
    const deviceTab = reduceScenarioSelection(chosen, { type: "selectTab", tab: "device" });
    const scenarioTab = reduceScenarioSelection(deviceTab, { type: "selectTab", tab: "scenario" });
    expect(scenarioTab.scenarioId).toBe("trinity");
    expect(scenarioTab.cameraRequest).toBe(chosen.cameraRequest);
    const changed = reduceScenarioSelection(scenarioTab, { type: "selectDevice", id: "moab" });
    expect(changed.scenarioId).toBe("");
    expect(changed.selectedId).toBe("moab");
    expect(reduceScenarioSelection(chosen, { type: "selectScenario", id: "" }).cameraRequest).toBe(chosen.cameraRequest);
  });

  it("scales framing monotonically and bounds it to the Earth", () => {
    expect(scenarioHorizonKm(0.01, 1)).toBeCloseTo(5.184, 6);
    expect(scenarioHorizonKm(0.1, 1)).toBeGreaterThan(scenarioHorizonKm(0.01, 1));
    expect(scenarioHorizonKm(0.1, 3)).toBeGreaterThan(scenarioHorizonKm(0.1, 1));
    expect(scenarioHorizonKm(1e9, 1)).toBeLessThan(Math.PI * 6371);
    expect(() => scenarioHorizonKm(0, 1)).toThrow(RangeError);
    expect(() => scenarioHorizonKm(1, 0)).toThrow(RangeError);
  });
});
