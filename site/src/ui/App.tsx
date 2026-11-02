import { useEffect, useReducer } from "react";
import { INITIAL_SIMULATOR_STATE, reduceSimulator, type FlightRoute } from "../application/launch";
import { resolveDeviceSelection } from "../application/deviceSelection";
import { DevicePanel } from "./DevicePanel";
import { MapViewport } from "./MapViewport";

/** Injected monotonic clock and frame scheduler, measured in milliseconds. */
export interface AnimationClock {
  now(): number;
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(id: number): void;
}

const browserClock: AnimationClock = {
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (id) => cancelAnimationFrame(id),
};

/** Root application view: controls dispatch semantic actions to a pure simulator reducer. */
export function App({ clock = browserClock }: { readonly clock?: AnimationClock }) {
  const [state, dispatch] = useReducer(reduceSimulator, INITIAL_SIMULATOR_STATE);
  const selection = resolveDeviceSelection(state);

  useEffect(() => {
    if (!state.launch || state.elapsedMs >= state.launch.flightMs + 3000) return;
    const launchId = state.launch.id;
    const frame = clock.requestFrame(() => dispatch({ type: "tick", nowMs: clock.now(), launchId }));
    return () => clock.cancelFrame(frame);
  }, [clock, state.launch, state.elapsedMs]);

  const launchAt = (route: FlightRoute) => {
    if (!selection.valid) return;
    dispatch({ type: "launchAt", route, deviceId: selection.device.id, yieldMt: selection.device.yieldMt, nowMs: clock.now() });
  };

  return (
    <MapViewport cameraRequest={state.cameraRequest} launch={state} onLaunch={launchAt}>
      <DevicePanel
        state={state}
        selection={selection}
        launchPhase={state.phase}
        onSelectTab={(tab) => dispatch({ type: "selectTab", tab })}
        onSelectScenario={(id) => dispatch({ type: "selectScenario", id })}
        onSelectDevice={(id) => dispatch({ type: "selectDevice", id })}
        onCustomYieldChange={(value) => dispatch({ type: "setCustomYieldInput", value })}
      />
    </MapViewport>
  );
}
