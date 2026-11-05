import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { SimulatorStore, type AnimationClock } from "../application/SimulatorStore";
import { resolveDeviceSelection } from "../application/deviceSelection";
import { cloudPresentationForState } from "../application/cloudPresentation";
import { falloutLegendForFrames } from "../application/effectPresentation";
import { falloutAvailable, launchFramesForState } from "../application/launch";
import type { FalloutBandId } from "../domain/fallout";
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
  const [cancelPendingVersion, setCancelPendingVersion] = useState(0);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const panelState = useMemo(() => ({
    tab: state.tab,
    scenarioId: state.scenarioId,
    selectedId: state.selectedId,
    customYieldInput: state.customYieldInput,
  }), [state.tab, state.scenarioId, state.selectedId, state.customYieldInput]);
  const selection = useMemo(() => resolveDeviceSelection(panelState), [panelState]);
  const cloud = useMemo(() => cloudPresentationForState(state), [state]);
  const frames = useMemo(() => launchFramesForState(state), [state]);
  const falloutLegend = useMemo(() => falloutLegendForFrames(frames), [frames]);
  const impactCount = frames.filter((frame) => frame.elapsedMs >= frame.launch.flightMs).length;
  const cancelPending = useCallback(() => setCancelPendingVersion((version) => version + 1), []);
  const selectTab = useCallback((tab: "scenario" | "device") => store.dispatch({ type: "selectTab", tab }), [store]);
  const selectScenario = useCallback((id: string) => store.dispatch({ type: "selectScenario", id }), [store]);
  const selectDevice = useCallback((id: string) => store.dispatch({ type: "selectDevice", id }), [store]);
  const setCustomYieldInput = useCallback((value: string) => store.dispatch({ type: "setCustomYieldInput", value }), [store]);
  const reset = useCallback(() => { cancelPending(); store.dispatch({ type: "reset" }); }, [cancelPending, store]);
  const setMultiLaunch = useCallback((enabled: boolean) => store.dispatch({ type: "setMultiLaunch", enabled }), [store]);
  const hoverZone = useCallback((zoneId: BlastZoneId | null) => store.dispatch({ type: "hoverZone", zoneId }), [store]);
  const focusZone = useCallback((zoneId: BlastZoneId | null) => store.dispatch({ type: "focusZone", zoneId }), [store]);
  const pinZone = useCallback((zoneId: BlastZoneId) => store.dispatch({ type: "pinZone", zoneId }), [store]);
  const clearZoneInspection = useCallback(() => store.dispatch({ type: "clearZoneInspection" }), [store]);
  const selectEffectView = useCallback((view: "blast" | "fallout") => store.dispatch({ type: "setEffectView", view }), [store]);
  const hoverFallout = useCallback((id: FalloutBandId | null) => store.dispatch({ type: "hoverFallout", id }), [store]);
  const focusFallout = useCallback((id: FalloutBandId | null) => store.dispatch({ type: "focusFallout", id }), [store]);
  const pinFallout = useCallback((id: FalloutBandId) => store.dispatch({ type: "pinFallout", id }), [store]);
  const clearFallout = useCallback(() => store.dispatch({ type: "clearFalloutInspection" }), [store]);

  return (
    <MapViewport
      cameraRequest={state.cameraRequest} launch={state} frames={frames}
      onLaunch={store.launchAtWithIntent} prepareLaunch={store.prepareLaunchAt} launchAngle={store.nextLaunchAngle}
      cancelPendingVersion={cancelPendingVersion} onPendingChange={store.setPendingLaunch}
      onHoverZone={hoverZone} onFocusZone={focusZone} onPinZone={pinZone} onClearZoneInspection={clearZoneInspection}
      falloutEligible={falloutAvailable(state)} falloutLegendZones={falloutLegend} onSelectEffectView={selectEffectView}
      onHoverFallout={hoverFallout} onFocusFallout={focusFallout} onPinFallout={pinFallout} onClearFallout={clearFallout}
    >
      <DevicePanel
        state={panelState}
        selection={selection}
        launchPhase={state.phase}
        cloud={cloud}
        multiLaunch={state.multiLaunch}
        impactCount={impactCount}
        totalCount={frames.length}
        pendingLaunch={state.pendingLaunch}
        onReset={reset}
        onSetMultiLaunch={setMultiLaunch}
        onSelectTab={selectTab}
        onSelectScenario={selectScenario}
        onSelectDevice={selectDevice}
        onCustomYieldChange={setCustomYieldInput}
      />
    </MapViewport>
  );
}
