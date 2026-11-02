import type { GeoPoint } from "../domain/geodesy";
import type { ScenarioSelectionAction, ScenarioSelectionState } from "./scenarioSelection";
import { INITIAL_SCENARIO_SELECTION, reduceScenarioSelection } from "./scenarioSelection";

/** Normal carrier travel time in milliseconds, taken from the prototype. */
export const FLIGHT_MS = 6500;

/** One geographically anchored carrier route, with a quadratic control point. */
export interface FlightRoute {
  readonly start: GeoPoint;
  readonly control: GeoPoint;
  readonly target: GeoPoint;
}

/** A click's selected device, geographic route, and monotonic launch time. */
export interface Launch {
  readonly id: number;
  readonly deviceId: string;
  readonly yieldMt: number;
  readonly route: FlightRoute;
  readonly launchedAtMs: number;
  readonly flightMs: number;
}

/** Current single-launch state; detonation artwork is added in Plan 05. */
export interface SimulatorState extends ScenarioSelectionState {
  readonly phase: "armed" | "inbound" | "complete";
  readonly launch: Launch | null;
  readonly elapsedMs: number;
  readonly nextLaunchId: number;
}

/** Semantic state changes. A tick uses injected monotonic milliseconds. */
export type SimulatorAction = ScenarioSelectionAction
  | { readonly type: "launchAt"; readonly route: FlightRoute; readonly deviceId: string; readonly yieldMt: number; readonly nowMs: number; readonly flightMs?: number }
  | { readonly type: "tick"; readonly nowMs: number; readonly launchId: number }
  | { readonly type: "reset" };

/** Armed simulator with the prototype's initial device selection. */
export const INITIAL_SIMULATOR_STATE: SimulatorState = {
  ...INITIAL_SCENARIO_SELECTION,
  phase: "armed",
  launch: null,
  elapsedMs: 0,
  nextLaunchId: 1,
};

/** Pure launch and selection transitions; stale ticks cannot advance a replacement flight. */
export function reduceSimulator(state: SimulatorState, action: SimulatorAction): SimulatorState {
  if (action.type === "launchAt") {
    if (!Number.isFinite(action.nowMs) || !Number.isFinite(action.yieldMt) || action.yieldMt <= 0) return state;
    const flightMs = action.flightMs ?? FLIGHT_MS;
    if (!Number.isFinite(flightMs) || flightMs <= 0) return state;
    return {
      ...state,
      phase: "inbound",
      launch: { id: state.nextLaunchId, deviceId: action.deviceId, yieldMt: action.yieldMt, route: action.route, launchedAtMs: action.nowMs, flightMs },
      elapsedMs: 0,
      nextLaunchId: state.nextLaunchId + 1,
    };
  }
  if (action.type === "tick") {
    if (!state.launch || state.launch.id !== action.launchId || !Number.isFinite(action.nowMs)) return state;
    const elapsedMs = Math.min(state.launch.flightMs + 3000, Math.max(state.elapsedMs, action.nowMs - state.launch.launchedAtMs));
    if (elapsedMs === state.elapsedMs) return state;
    return { ...state, elapsedMs, phase: elapsedMs >= state.launch.flightMs ? "complete" : "inbound" };
  }
  if (action.type === "reset") return { ...state, phase: "armed", launch: null, elapsedMs: 0 };
  return { ...state, ...reduceScenarioSelection(state, action) };
}
