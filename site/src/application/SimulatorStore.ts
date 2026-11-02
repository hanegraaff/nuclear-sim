import { resolveDeviceSelection } from "./deviceSelection";
import { INITIAL_SIMULATOR_STATE, reduceSimulator, type FlightRoute, type SimulatorAction, type SimulatorState } from "./launch";

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

  /** Launch the selected valid device at a geographic route. Invalid drafts are ignored. */
  readonly launchAt = (route: FlightRoute): void => {
    const selection = resolveDeviceSelection(this.state);
    if (!selection.valid) return;
    this.dispatch({ type: "launchAt", route, deviceId: selection.device.id, yieldMt: selection.device.yieldMt, nowMs: this.clock.now() });
  };

  /** Stable radians for the next launch; each launch enters from a different edge. */
  readonly nextLaunchAngle = (): number => -Math.PI / 4 + (this.state.nextLaunchId - 1) * Math.PI * (3 - Math.sqrt(5));

  private scheduleFrame(): void {
    if (this.frameId !== null || this.listeners.size === 0) return;
    const launch = this.state.launch;
    if (!launch || this.state.elapsedMs >= launch.flightMs + 3000) return;
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
