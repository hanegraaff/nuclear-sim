import type { GeoPoint } from "../domain/geodesy";
import type { ScenarioSelectionAction, ScenarioSelectionState } from "./scenarioSelection";
import { INITIAL_SCENARIO_SELECTION, reduceScenarioSelection } from "./scenarioSelection";
import { blastRadiiForYield, type BlastRadii } from "../domain/blast";
import type { BlastZoneId } from "../domain/blastZones";

/** Normal carrier travel time in milliseconds, taken from the prototype. */
export const FLIGHT_MS = 6500;
/** Prototype's blast expansion duration in milliseconds. */
export const BLAST_MS = 4600;

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
  readonly blastMs: number;
  readonly radii: BlastRadii;
}

/** Current single-strike phase, effect age, and immutable selected device. */
export interface SimulatorState extends ScenarioSelectionState {
  readonly phase: "armed" | "inbound" | "detonating" | "complete";
  readonly launch: Launch | null;
  readonly elapsedMs: number;
  readonly nextLaunchId: number;
  readonly activeZoneId: BlastZoneId | null;
  readonly hoveredZoneId: BlastZoneId | null;
  readonly focusedZoneId: BlastZoneId | null;
  readonly pinnedZoneId: BlastZoneId | null;
}

/** Semantic state changes. A tick uses injected monotonic milliseconds. */
export type SimulatorAction = ScenarioSelectionAction
  | { readonly type: "launchAt"; readonly route: FlightRoute; readonly deviceId: string; readonly yieldMt: number; readonly nowMs: number; readonly flightMs?: number }
  | { readonly type: "tick"; readonly nowMs: number; readonly launchId: number }
  | { readonly type: "reset" }
  | { readonly type: "hoverZone"; readonly zoneId: BlastZoneId | null }
  | { readonly type: "focusZone"; readonly zoneId: BlastZoneId | null }
  | { readonly type: "pinZone"; readonly zoneId: BlastZoneId }
  | { readonly type: "clearZoneInspection" };

/** Armed simulator with the prototype's initial device selection. */
export const INITIAL_SIMULATOR_STATE: SimulatorState = {
  ...INITIAL_SCENARIO_SELECTION,
  phase: "armed",
  launch: null,
  elapsedMs: 0,
  nextLaunchId: 1,
  activeZoneId: null,
  hoveredZoneId: null,
  focusedZoneId: null,
  pinnedZoneId: null,
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
      launch: { id: state.nextLaunchId, deviceId: action.deviceId, yieldMt: action.yieldMt, route: action.route, launchedAtMs: action.nowMs, flightMs, blastMs: BLAST_MS, radii: blastRadiiForYield(action.yieldMt) },
      elapsedMs: 0,
      activeZoneId: null,
      hoveredZoneId: null,
      focusedZoneId: null,
      pinnedZoneId: null,
      nextLaunchId: state.nextLaunchId + 1,
    };
  }
  if (action.type === "tick") {
    if (!state.launch || state.launch.id !== action.launchId || !Number.isFinite(action.nowMs)) return state;
    const elapsedMs = Math.min(state.launch.flightMs + state.launch.blastMs, Math.max(state.elapsedMs, action.nowMs - state.launch.launchedAtMs));
    if (elapsedMs === state.elapsedMs) return state;
    const phase = elapsedMs >= state.launch.flightMs + state.launch.blastMs ? "complete"
      : elapsedMs >= state.launch.flightMs ? "detonating" : "inbound";
    return { ...state, elapsedMs, phase };
  }
  if (action.type === "hoverZone") {
    if (action.zoneId === state.hoveredZoneId) return state;
    return updateInspection(state, action.zoneId, state.focusedZoneId, state.pinnedZoneId);
  }
  if (action.type === "focusZone") {
    if (action.zoneId === state.focusedZoneId) return state;
    return updateInspection(state, state.hoveredZoneId, action.zoneId, state.pinnedZoneId);
  }
  if (action.type === "pinZone") {
    const pinnedZoneId = state.pinnedZoneId === action.zoneId ? null : action.zoneId;
    return updateInspection(state, state.hoveredZoneId, state.focusedZoneId, pinnedZoneId);
  }
  if (action.type === "clearZoneInspection") {
    return state.activeZoneId === null && state.hoveredZoneId === null && state.focusedZoneId === null && state.pinnedZoneId === null
      ? state : updateInspection(state, null, null, null);
  }
  if (action.type === "reset") return { ...state, phase: "armed", launch: null, elapsedMs: 0, activeZoneId: null, hoveredZoneId: null, focusedZoneId: null, pinnedZoneId: null };
  return { ...state, ...reduceScenarioSelection(state, action) };
}

/** Recompute visible inspection from pointer, keyboard focus, and pinned selection. */
function updateInspection(state: SimulatorState, hoveredZoneId: BlastZoneId | null, focusedZoneId: BlastZoneId | null, pinnedZoneId: BlastZoneId | null): SimulatorState {
  return { ...state, hoveredZoneId, focusedZoneId, pinnedZoneId, activeZoneId: hoveredZoneId ?? focusedZoneId ?? pinnedZoneId };
}
