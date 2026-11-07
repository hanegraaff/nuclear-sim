import { resolveDeviceSelection } from "./deviceSelection";
import { prepareLaunch, type PreparedLaunch } from "./launchPreparation";
import type { GeoPoint } from "../domain/geodesy";
import { INITIAL_SIMULATOR_STATE, launchFramesForState, reduceSimulator, type FlightRoute, type LaunchIntent, type SimulatorAction, type SimulatorState } from "./launch";

/** Monotonic milliseconds and cancellable frame callbacks supplied by the host. */
export interface AnimationClock {
  now(): number;
  requestFrame(callback: () => void): number;
  cancelFrame(id: number): void;
}

/**
 * Owns simulator transitions and the single pending animation frame.
 * React subscribes to snapshots and dispatches semantic actions only.
 */
export class SimulatorStore {
  private state: SimulatorState = INITIAL_SIMULATOR_STATE;
  private readonly listeners = new Set<() => void>();
  private frameId: number | null = null;
  private reducedMotion = false;

  constructor(private readonly clock: AnimationClock) {}

  /** Return the current immutable application snapshot. */
  readonly getSnapshot = (): SimulatorState => this.state;

  /** Subscribe to state changes; the final unsubscribe cancels pending work. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    this.scheduleFrame();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.cancelFrame();
    };
  };

  /** Apply a semantic action and notify subscribers when state actually changes. */
  readonly dispatch = (action: SimulatorAction): void => {
    const previousLaunchId = this.state.launch?.id;
    const next = reduceSimulator(this.state, action);
    if (next === this.state) {
      this.scheduleFrame();
      return;
    }
    this.state = next;
    if (previousLaunchId !== next.launch?.id) this.cancelFrame();
    this.listeners.forEach((listener) => listener());
    this.scheduleFrame();
  };

  /** Set preference for future launches; active launches retain their timing. */
  readonly setReducedMotion = (enabled: boolean): void => { this.reducedMotion = enabled; };

  /** Launch the selected valid device at a geographic route. Invalid drafts are ignored. */
  readonly launchAt = (route: FlightRoute): void => {
    const selection = resolveDeviceSelection(this.state);
    if (!selection.valid) return;
    this.launchAtWithIntent(route, { deviceId: selection.device.id, yieldMt: selection.device.yieldMt });
  };

  /** Dispatch a route using the device frozen when its map click was made. */
  readonly launchAtWithIntent = (route: FlightRoute, intent: LaunchIntent): void => {
    this.dispatch({ type: "launchAt", route, deviceId: intent.deviceId, yieldMt: intent.yieldMt, nowMs: this.clock.now(), reducedMotion: this.reducedMotion });
  };

  /** Freeze the selected device and modeled geographic targets for a map click. */
  readonly prepareLaunchAt = (aim: GeoPoint): PreparedLaunch | null => {
    const selection = resolveDeviceSelection(this.state);
    return selection.valid ? prepareLaunch(selection.device, aim) : null;
  };

  /** Mirror rendering-owned pending framing in the application snapshot. */
  readonly setPendingLaunch = (pending: boolean): void => this.dispatch({ type: "setPendingLaunch", pending });

  /** Hold a deterministic entry bearing from the first group until Reset or mode change. */
  readonly nextLaunchAngle = (): number => {
    const entryId = this.state.multiLaunch ? this.state.launchGroups[0]?.id ?? this.state.nextLaunchId : this.state.nextLaunchId;
    return -Math.PI / 4 + (entryId - 1) * Math.PI * (3 - Math.sqrt(5));
  };

  private scheduleFrame(): void {
    if (this.frameId !== null || this.listeners.size === 0) return;
    const launch = this.state.launch;
    if (!launch || launchFramesForState(this.state).every((frame) => frame.elapsedMs >= frame.launch.flightMs + frame.launch.blastMs)) return;
    this.frameId = this.clock.requestFrame(() => {
      this.frameId = null;
      this.dispatch({ type: "tick", nowMs: this.clock.now(), launchId: launch.id });
    });
  }

  private cancelFrame(): void {
    if (this.frameId === null) return;
    this.clock.cancelFrame(this.frameId);
    this.frameId = null;
  }
}
