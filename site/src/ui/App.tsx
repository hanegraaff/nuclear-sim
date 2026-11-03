import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { SimulatorStore, type AnimationClock } from "../application/SimulatorStore";
import { resolveDeviceSelection } from "../application/deviceSelection";
import type { BlastZoneId } from "../domain/blastZones";
import { DevicePanel } from "./DevicePanel";
import { MapViewport } from "./MapViewport";

const browserClock: AnimationClock = {
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (id) => cancelAnimationFrame(id),
};

/** Root application view: controls dispatch semantic actions to a pure simulator reducer. */
export function App({ clock = browserClock }: { readonly clock?: AnimationClock }) {
  const [store] = useState(() => new SimulatorStore(clock));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const panelState = useMemo(() => ({
    tab: state.tab,
    scenarioId: state.scenarioId,
    selectedId: state.selectedId,
    customYieldInput: state.customYieldInput,
  }), [state.tab, state.scenarioId, state.selectedId, state.customYieldInput]);
  const selection = useMemo(() => resolveDeviceSelection(panelState), [panelState]);
  const selectTab = useCallback((tab: "scenario" | "device") => store.dispatch({ type: "selectTab", tab }), [store]);
  const selectScenario = useCallback((id: string) => store.dispatch({ type: "selectScenario", id }), [store]);
  const selectDevice = useCallback((id: string) => store.dispatch({ type: "selectDevice", id }), [store]);
  const setCustomYieldInput = useCallback((value: string) => store.dispatch({ type: "setCustomYieldInput", value }), [store]);
  const reset = useCallback(() => store.dispatch({ type: "reset" }), [store]);
  const inspectZone = useCallback((zoneId: BlastZoneId | null) => store.dispatch({ type: "inspectZone", zoneId }), [store]);
  const pinZone = useCallback((zoneId: BlastZoneId) => store.dispatch({ type: "pinZone", zoneId }), [store]);
  const clearZoneInspection = useCallback(() => store.dispatch({ type: "clearZoneInspection" }), [store]);

  return (
    <MapViewport cameraRequest={state.cameraRequest} launch={state} onLaunch={store.launchAt} launchAngle={store.nextLaunchAngle} onInspectZone={inspectZone} onPinZone={pinZone} onClearZoneInspection={clearZoneInspection}>
      <DevicePanel
        state={panelState}
        selection={selection}
        launchPhase={state.phase}
        onReset={reset}
        onSelectTab={selectTab}
        onSelectScenario={selectScenario}
        onSelectDevice={selectDevice}
        onCustomYieldChange={setCustomYieldInput}
      />
    </MapViewport>
  );
}
