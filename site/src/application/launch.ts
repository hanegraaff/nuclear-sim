import type { GeoPoint } from "../domain/geodesy";
import type { ScenarioSelectionAction, ScenarioSelectionState } from "./scenarioSelection";
import { INITIAL_SCENARIO_SELECTION, reduceScenarioSelection } from "./scenarioSelection";
import { blastRadiiForYield, type BlastRadii } from "../domain/blast";
import type { BlastZoneId } from "../domain/blastZones";
import { getDeviceById } from "../catalog/devices";
import { mirvImpactTargets } from "../domain/mirv";
import { planMirvCarrier } from "./mirvCarrierPlan";
import { modelFallout, type FalloutBandId, type FalloutFootprint } from "../domain/fallout";
import type { AudibleBandId } from "../domain/audible";

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

/** Selected delivery frozen at a map click; yield is total megatons. */
export interface LaunchIntent {
  readonly deviceId: string;
  readonly yieldMt: number;
}

/** Shared geographic carrier route and millisecond split timing for one MIRV click. */
export interface MirvCarrier {
  readonly route: FlightRoute;
  readonly splitMs: number;
  readonly carrierFlightMs: number;
  readonly lead: boolean;
}

/** One delivered warhead with geographic route, megaton yield, and monotonic millisecond timing. */
export interface Launch {
  readonly id: number;
  readonly deviceId: string;
  readonly yieldMt: number;
  readonly route: FlightRoute;
  readonly launchedAtMs: number;
  readonly flightMs: number;
  readonly blastMs: number;
  readonly radii: BlastRadii;
  /** H+24 screening geometry exists only for nuclear devices. */
  readonly fallout?: FalloutFootprint;
  /** Absent for a single device; all reentry vehicles share one carrier route. */
  readonly mirv?: MirvCarrier;
}

/** One map click and all of its geographically anchored deliveries. */
export interface LaunchGroup {
  readonly id: number;
  readonly launches: readonly Launch[];
}

/** A delivery paired with its current injected-clock age in milliseconds. */
export interface LaunchFrame {
  readonly launch: Launch;
  readonly elapsedMs: number;
}

/** Current phase, immutable launch groups, and latest-delivery compatibility view. */
export interface SimulatorState extends ScenarioSelectionState {
  readonly phase: "armed" | "inbound" | "detonating" | "complete";
  readonly multiLaunch: boolean;
  readonly pendingLaunch: boolean;
  readonly effectView: "blast" | "fallout" | "audible";
  readonly activeAudibleId: AudibleBandId | null;
  readonly hoveredAudibleId: AudibleBandId | null;
  readonly focusedAudibleId: AudibleBandId | null;
  readonly pinnedAudibleId: AudibleBandId | null;
  readonly activeFalloutId: FalloutBandId | null;
  readonly hoveredFalloutId: FalloutBandId | null;
  readonly focusedFalloutId: FalloutBandId | null;
  readonly pinnedFalloutId: FalloutBandId | null;
  readonly launchGroups: readonly LaunchGroup[];
  readonly nowMs: number;
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
  | { readonly type: "setMultiLaunch"; readonly enabled: boolean }
  | { readonly type: "setPendingLaunch"; readonly pending: boolean }
  | { readonly type: "setEffectView"; readonly view: "blast" | "fallout" | "audible" }
  | { readonly type: "hoverAudible"; readonly id: AudibleBandId | null }
  | { readonly type: "focusAudible"; readonly id: AudibleBandId | null }
  | { readonly type: "pinAudible"; readonly id: AudibleBandId }
  | { readonly type: "clearAudibleInspection" }
  | { readonly type: "hoverFallout"; readonly id: FalloutBandId | null }
  | { readonly type: "focusFallout"; readonly id: FalloutBandId | null }
  | { readonly type: "pinFallout"; readonly id: FalloutBandId }
  | { readonly type: "clearFalloutInspection" }
  | { readonly type: "reset" }
  | { readonly type: "hoverZone"; readonly zoneId: BlastZoneId | null }
  | { readonly type: "focusZone"; readonly zoneId: BlastZoneId | null }
  | { readonly type: "pinZone"; readonly zoneId: BlastZoneId }
  | { readonly type: "clearZoneInspection" };

/** Armed simulator with the prototype's initial device selection. */
export const INITIAL_SIMULATOR_STATE: SimulatorState = {
  ...INITIAL_SCENARIO_SELECTION,
  phase: "armed",
  multiLaunch: false,
  pendingLaunch: false,
  effectView: "blast",
  activeAudibleId: null,
  hoveredAudibleId: null,
  focusedAudibleId: null,
  pinnedAudibleId: null,
  activeFalloutId: null,
  hoveredFalloutId: null,
  focusedFalloutId: null,
  pinnedFalloutId: null,
  launchGroups: [],
  nowMs: 0,
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
    const device = getDeviceById(action.deviceId);
    const count = device?.warheadCount ?? 1;
    const yieldMt = device?.warheadYieldMt ?? action.yieldMt;
    const radii = blastRadiiForYield(yieldMt);
    const targets = count > 1 ? mirvImpactTargets(action.route.target, count, radii.light) : [action.route.target];
    const staggerMs = flightMs < 1000 ? 8 : 45;
    const carrier = count > 1 ? planMirvCarrier(action.route, targets, flightMs, flightMs + (count - 1) * staggerMs) : null;
    const launches: readonly Launch[] = targets.map((target, index) => ({
      id: state.nextLaunchId + index,
      deviceId: action.deviceId,
      yieldMt,
      route: carrier ? { ...carrier.route, target } : action.route,
      launchedAtMs: action.nowMs,
      flightMs: flightMs + (carrier ? index * staggerMs : 0),
      blastMs: BLAST_MS,
      radii,
      ...(action.deviceId !== "moab" && action.deviceId !== "foab" ? { fallout: modelFallout(target, yieldMt, state.nextLaunchId + index) } : {}),
      ...(carrier ? { mirv: { route: carrier.route, splitMs: carrier.splitMs, carrierFlightMs: flightMs, lead: index === 0 } } : {}),
    }));
    const group: LaunchGroup = { id: state.nextLaunchId, launches };
    const launch = launches.at(-1)!;
    return {
      ...state,
      phase: state.multiLaunch ? phaseForGroups([...state.launchGroups, group], action.nowMs) : "inbound",
      launchGroups: state.multiLaunch ? [...state.launchGroups, group] : [group],
      nowMs: action.nowMs,
      launch,
      elapsedMs: 0,
      effectView: "blast",
      activeAudibleId: null, hoveredAudibleId: null, focusedAudibleId: null, pinnedAudibleId: null,
      activeFalloutId: null,
      hoveredFalloutId: null,
      focusedFalloutId: null,
      pinnedFalloutId: null,
      activeZoneId: null,
      hoveredZoneId: null,
      focusedZoneId: null,
      pinnedZoneId: null,
      nextLaunchId: state.nextLaunchId + launches.length,
    };
  }
  if (action.type === "tick") {
    if (!state.launch || state.launch.id !== action.launchId || !Number.isFinite(action.nowMs)) return state;
    const nowMs = Math.max(state.nowMs, action.nowMs);
    const elapsedMs = Math.max(state.elapsedMs, elapsedForLaunch(state.launch, nowMs));
    const active = state.launchGroups.some((group) => group.launches.some((launch) => elapsedForLaunch(launch, state.nowMs) < launch.flightMs + launch.blastMs));
    if (elapsedMs === state.elapsedMs && (!active || nowMs === state.nowMs)) return state;
    return { ...state, nowMs, elapsedMs, phase: phaseForGroups(state.launchGroups, nowMs) };
  }
  if (action.type === "setMultiLaunch") {
    if (state.multiLaunch === action.enabled) return state;
    const launchGroups = action.enabled ? state.launchGroups : state.launchGroups.slice(-1);
    const launch = launchGroups.at(-1)?.launches.at(-1) ?? null;
    return {
      ...state,
      multiLaunch: action.enabled,
      launchGroups,
      launch,
      elapsedMs: launch ? elapsedForLaunch(launch, state.nowMs) : 0,
      phase: phaseForGroups(launchGroups, state.nowMs),
      effectView: state.effectView === "fallout" && !launchGroups.some((group) => group.launches.some((delivery) => delivery.fallout)) ? "blast" : state.effectView,
      activeAudibleId: null, hoveredAudibleId: null, focusedAudibleId: null, pinnedAudibleId: null,
      activeFalloutId: null,
      hoveredFalloutId: null,
      focusedFalloutId: null,
      pinnedFalloutId: null,
      activeZoneId: null,
      hoveredZoneId: null,
      focusedZoneId: null,
      pinnedZoneId: null,
    };
  }
  if (action.type === "setPendingLaunch") {
    if (state.pendingLaunch === action.pending) return state;
    return {
      ...state,
      pendingLaunch: action.pending,
      ...(action.pending ? {
        effectView: "blast" as const,
        activeAudibleId: null, hoveredAudibleId: null, focusedAudibleId: null, pinnedAudibleId: null,
        activeFalloutId: null,
        hoveredFalloutId: null,
        focusedFalloutId: null,
        pinnedFalloutId: null,
      } : {}),
    };
  }
  if (action.type === "setEffectView") {
    if (state.phase !== "complete" || state.pendingLaunch || (action.view === "fallout" && !falloutAvailable(state))) return state;
    return {
      ...state,
      effectView: action.view,
      activeAudibleId: null, hoveredAudibleId: null, focusedAudibleId: null, pinnedAudibleId: null,
      activeZoneId: null,
      hoveredZoneId: null,
      focusedZoneId: null,
      pinnedZoneId: null,
      activeFalloutId: null,
      hoveredFalloutId: null,
      focusedFalloutId: null,
      pinnedFalloutId: null,
    };
  }
  if (action.type === "hoverFallout") return updateFalloutInspection(state, action.id, state.focusedFalloutId, state.pinnedFalloutId);
  if (action.type === "hoverAudible") return updateAudibleInspection(state, action.id, state.focusedAudibleId, state.pinnedAudibleId);
  if (action.type === "focusAudible") return updateAudibleInspection(state, state.hoveredAudibleId, action.id, state.pinnedAudibleId);
  if (action.type === "pinAudible") return updateAudibleInspection(state, state.hoveredAudibleId, state.focusedAudibleId, state.pinnedAudibleId === action.id ? null : action.id);
  if (action.type === "clearAudibleInspection") return updateAudibleInspection(state, null, null, null);
  if (action.type === "focusFallout") return updateFalloutInspection(state, state.hoveredFalloutId, action.id, state.pinnedFalloutId);
  if (action.type === "pinFallout") return updateFalloutInspection(state, state.hoveredFalloutId, state.focusedFalloutId, state.pinnedFalloutId === action.id ? null : action.id);
  if (action.type === "clearFalloutInspection") return updateFalloutInspection(state, null, null, null);
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
  if (action.type === "reset") return { ...state, phase: "armed", launchGroups: [], launch: null, pendingLaunch: false, elapsedMs: 0, effectView: "blast", activeAudibleId: null, hoveredAudibleId: null, focusedAudibleId: null, pinnedAudibleId: null, activeFalloutId: null, hoveredFalloutId: null, focusedFalloutId: null, pinnedFalloutId: null, activeZoneId: null, hoveredZoneId: null, focusedZoneId: null, pinnedZoneId: null };
  return { ...state, ...reduceScenarioSelection(state, action) };
}

/** Nuclear fallout eligibility follows retained launches, never the current device selection. */
export function falloutAvailable(state: Pick<SimulatorState, "launchGroups">): boolean {
  return state.launchGroups.some((group) => group.launches.some((launch) => launch.fallout));
}

/** Resolve pointer, focus and pinned fallout inspection without crossing into UI state. */
function updateFalloutInspection(state: SimulatorState, hoveredFalloutId: FalloutBandId | null, focusedFalloutId: FalloutBandId | null, pinnedFalloutId: FalloutBandId | null): SimulatorState {
  if (state.effectView !== "fallout") return state;
  return { ...state, hoveredFalloutId, focusedFalloutId, pinnedFalloutId, activeFalloutId: hoveredFalloutId ?? focusedFalloutId ?? pinnedFalloutId };
}

/** Resolve hovered, keyboard-focused, and pinned hearing bands in the active view. */
function updateAudibleInspection(state: SimulatorState, hoveredAudibleId: AudibleBandId | null, focusedAudibleId: AudibleBandId | null, pinnedAudibleId: AudibleBandId | null): SimulatorState {
  if (state.effectView !== "audible") return state;
  return { ...state, hoveredAudibleId, focusedAudibleId, pinnedAudibleId, activeAudibleId: hoveredAudibleId ?? focusedAudibleId ?? pinnedAudibleId };
}

/** Clamp one delivery's age to its finite flight plus expansion interval. */
export function elapsedForLaunch(launch: Launch, nowMs: number): number {
  return Math.min(launch.flightMs + launch.blastMs, Math.max(0, nowMs - launch.launchedAtMs));
}

/** Flatten click groups without losing each delivery's own geographic profile. */
export function launchFramesForState(state: SimulatorState): readonly LaunchFrame[] {
  return state.launchGroups.flatMap((group) => group.launches.map((launch) => ({ launch, elapsedMs: elapsedForLaunch(launch, state.nowMs) })));
}

/** Prioritize a live detonation over an inbound carrier in the aggregate status. */
function phaseForGroups(groups: readonly LaunchGroup[], nowMs: number): SimulatorState["phase"] {
  if (groups.length === 0) return "armed";
  let inbound = false;
  for (const group of groups) for (const launch of group.launches) {
    const age = elapsedForLaunch(launch, nowMs);
    if (age >= launch.flightMs && age < launch.flightMs + launch.blastMs) return "detonating";
    if (age < launch.flightMs) inbound = true;
  }
  return inbound ? "inbound" : "complete";
}

/** Recompute visible inspection from pointer, keyboard focus, and pinned selection. */
function updateInspection(state: SimulatorState, hoveredZoneId: BlastZoneId | null, focusedZoneId: BlastZoneId | null, pinnedZoneId: BlastZoneId | null): SimulatorState {
  return { ...state, hoveredZoneId, focusedZoneId, pinnedZoneId, activeZoneId: hoveredZoneId ?? focusedZoneId ?? pinnedZoneId };
}
