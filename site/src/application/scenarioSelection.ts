import { getDeviceById, perWarheadYieldMt } from "../catalog/devices";
import { getScenarioById } from "../catalog/scenarios";
import { type GeoPoint } from "../domain/geodesy";
import { scenarioHorizonKm } from "../domain/scenarioScale";
import { INITIAL_DEVICE_SELECTION, reduceDeviceSelection, type DeviceSelectionAction, type DeviceSelectionState } from "./deviceSelection";

/** A map-independent request to frame a geographic point and horizon in kilometers. */
export interface ScenarioCameraRequest {
  readonly sequence: number;
  readonly center: GeoPoint;
  readonly horizonKm: number;
}

/** Selected tab, scenario, device and most recent camera request. */
export interface ScenarioSelectionState extends DeviceSelectionState {
  readonly tab: "scenario" | "device";
  readonly scenarioId: string;
  readonly cameraRequest: ScenarioCameraRequest | null;
}

/** Semantic actions for changing tabs, selecting scenarios, or editing the device. */
export type ScenarioSelectionAction = DeviceSelectionAction
  | { readonly type: "selectTab"; readonly tab: "scenario" | "device" }
  | { readonly type: "selectScenario"; readonly id: string };

/** Initial prototype tab and device, with no selected scenario or camera request. */
export const INITIAL_SCENARIO_SELECTION: ScenarioSelectionState = {
  ...INITIAL_DEVICE_SELECTION,
  tab: "device",
  scenarioId: "",
  cameraRequest: null,
};

/** Apply a selection action without map, UI, or animation dependencies. */
export function reduceScenarioSelection(state: ScenarioSelectionState, action: ScenarioSelectionAction): ScenarioSelectionState {
  if (action.type === "selectTab") return state.tab === action.tab ? state : { ...state, tab: action.tab };
  if (action.type === "selectScenario") {
    if (!action.id) return { ...state, scenarioId: "" };
    const scenario = getScenarioById(action.id);
    if (!scenario) throw new RangeError(`Unknown scenario ID: ${action.id}`);
    const device = getDeviceById(scenario.deviceId);
    if (!device) throw new RangeError(`Unknown scenario device ID: ${scenario.deviceId}`);
    return {
      ...state,
      selectedId: device.id,
      scenarioId: scenario.id,
      cameraRequest: {
        sequence: (state.cameraRequest?.sequence ?? 0) + 1,
        center: scenario.point,
        horizonKm: scenarioHorizonKm(perWarheadYieldMt(device), device.warheadCount ?? 1),
      },
    };
  }
  return { ...state, ...reduceDeviceSelection(state, action), scenarioId: "" };
}
