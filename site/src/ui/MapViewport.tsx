import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FlightRoute, LaunchFrame, LaunchIntent, SimulatorState } from "../application/launch";
import type { ScenarioCameraRequest } from "../application/scenarioSelection";
import type { BlastZoneId } from "../domain/blastZones";
import type { BlastInspectionGeometry } from "../rendering/overlays/blastInspection";
import { INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from "../rendering/map/createSatelliteMap";
import {
  createSatelliteMapController,
  type MapLoadState,
  type SatelliteMapController,
} from "../rendering/map/SatelliteMapController";
import { BlastInspectionOverlay } from "./BlastInspectionOverlay";
import { MultiLaunchLegend } from "./MultiLaunchLegend";
import { mapDistanceScale } from "../rendering/overlays/mapDistanceScale";
import type { GeoPoint } from "../domain/geodesy";
import type { PreparedLaunch } from "../application/launchPreparation";
import type { FalloutBandId, FalloutZone } from "../domain/fallout";
import type { FalloutInspectionGeometry } from "../rendering/overlays/falloutInspection";
import { FalloutInspectionOverlay } from "./FalloutInspectionOverlay";
import { EffectViewSelector } from "./EffectViewSelector";
import type { AudibleBand, AudibleBandId } from "../domain/audible";
import type { AudibleInspectionGeometry } from "../rendering/overlays/audibleInspection";
import { AudibleInspectionOverlay } from "./AudibleInspectionOverlay";
import type { VisibleBand, VisibleBandId } from "../domain/visible";
import type { VisibleInspectionGeometry } from "../rendering/overlays/visibleInspection";
import { VisibleInspectionOverlay } from "./VisibleInspectionOverlay";
import { EyeIcon } from "./ControlIcons";

/** UI inputs and semantic callbacks; no MapLibre object crosses this boundary. */
interface MapViewportProps {
  readonly children?: ReactNode;
  readonly mapTone: "day" | "night";
  readonly panelsVisible: boolean;
  readonly onSetPanelsVisible: (visible: boolean) => void;
  readonly cameraRequest: ScenarioCameraRequest | null;
  readonly launch: Pick<SimulatorState, "phase" | "launch" | "elapsedMs" | "multiLaunch" | "activeZoneId" | "pinnedZoneId" | "effectView" | "activeFalloutId" | "pinnedFalloutId" | "activeAudibleId" | "pinnedAudibleId" | "activeVisibleId" | "pinnedVisibleId">;
  readonly frames: readonly LaunchFrame[];
  readonly onLaunch: (route: FlightRoute, intent: LaunchIntent) => void;
  readonly prepareLaunch: (aim: GeoPoint) => PreparedLaunch | null;
  readonly launchAngle: () => number;
  /** Increments when Reset or a selection/mode change invalidates a queued click. */
  readonly cancelPendingVersion: number;
  readonly onPendingChange: (pending: boolean) => void;
  readonly onHoverZone: (zoneId: BlastZoneId | null) => void;
  readonly onFocusZone: (zoneId: BlastZoneId | null) => void;
  readonly onPinZone: (zoneId: BlastZoneId) => void;
  readonly onClearZoneInspection: () => void;
  readonly falloutEligible: boolean;
  readonly falloutLegendZones: readonly FalloutZone[];
  readonly onSelectEffectView: (view: "blast" | "fallout" | "audible" | "visible") => void;
  readonly audibleLegendBands: readonly AudibleBand[];
  readonly onHoverAudible: (id: AudibleBandId | null) => void;
  readonly onFocusAudible: (id: AudibleBandId | null) => void;
  readonly onPinAudible: (id: AudibleBandId) => void;
  readonly onClearAudible: () => void;
  readonly visibleLegendBands: readonly VisibleBand[];
  readonly onHoverVisible: (id: VisibleBandId | null) => void;
  readonly onFocusVisible: (id: VisibleBandId | null) => void;
  readonly onPinVisible: (id: VisibleBandId) => void;
  readonly onClearVisible: () => void;
  readonly onHoverFallout: (id: FalloutBandId | null) => void;
  readonly onFocusFallout: (id: FalloutBandId | null) => void;
  readonly onPinFallout: (id: FalloutBandId) => void;
  readonly onClearFallout: () => void;
}

/** Full-viewport map mount that places controls above imagery and map feedback. */
export function MapViewport({
  children, mapTone, panelsVisible, onSetPanelsVisible, cameraRequest, launch, frames, onLaunch, prepareLaunch, launchAngle,
  cancelPendingVersion, onPendingChange, onHoverZone, onFocusZone, onPinZone,
  onClearZoneInspection, falloutEligible, falloutLegendZones, onSelectEffectView,
  onHoverFallout, onFocusFallout, onPinFallout, onClearFallout,
  audibleLegendBands, onHoverAudible, onFocusAudible, onPinAudible, onClearAudible,
  visibleLegendBands, onHoverVisible, onFocusVisible, onPinVisible, onClearVisible,
}: MapViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const missileCanvasRef = useRef<HTMLCanvasElement>(null);
  const blastCanvasRef = useRef<HTMLCanvasElement>(null);
  const fireballCanvasRef = useRef<HTMLCanvasElement>(null);
  const inspectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<SatelliteMapController | null>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const previousPanelsVisible = useRef(panelsVisible);
  const onLaunchRef = useRef(onLaunch);
  onLaunchRef.current = onLaunch;
  const prepareLaunchRef = useRef(prepareLaunch);
  prepareLaunchRef.current = prepareLaunch;
  const launchAngleRef = useRef(launchAngle);
  launchAngleRef.current = launchAngle;
  const onPendingChangeRef = useRef(onPendingChange);
  onPendingChangeRef.current = onPendingChange;
  const [loadState, setLoadState] = useState<MapLoadState>("loading");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<BlastInspectionGeometry | null>(null);
  const [falloutInspection, setFalloutInspection] = useState<FalloutInspectionGeometry | null>(null);
  const [audibleInspection, setAudibleInspection] = useState<AudibleInspectionGeometry | null>(null);
  const [visibleInspection, setVisibleInspection] = useState<VisibleInspectionGeometry | null>(null);
  const [camera, setCamera] = useState({
    longitude: INITIAL_MAP_CENTER.longitude,
    latitude: INITIAL_MAP_CENTER.latitude,
    zoom: INITIAL_MAP_ZOOM,
    pitch: 0,
    bearing: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !missileCanvasRef.current || !blastCanvasRef.current || !fireballCanvasRef.current || !inspectionCanvasRef.current) return;
    let controller: SatelliteMapController;
    try {
      controller = createSatelliteMapController(container, {
        onStateChange: setLoadState,
        onCameraChange: setCamera,
        onInspectionChange: setInspection,
        onFalloutInspectionChange: setFalloutInspection,
        onAudibleInspectionChange: setAudibleInspection,
        onVisibleInspectionChange: setVisibleInspection,
        onLaunch: (route, intent) => onLaunchRef.current(route, intent),
        prepareLaunch: (aim) => prepareLaunchRef.current(aim),
        launchAngle: () => launchAngleRef.current(),
        onPendingChange: (pending) => onPendingChangeRef.current(pending),
        onLaunchUnavailable: setLaunchError,
        clearMapTopPx: () => {
          const panel = container.parentElement?.querySelector(".left-instrument-stack");
          if (!panel) return 80;
          return panel.getBoundingClientRect().bottom - container.getBoundingClientRect().top + 14;
        },
      }, missileCanvasRef.current, blastCanvasRef.current, fireballCanvasRef.current, inspectionCanvasRef.current);
    } catch {
      setLoadState("map-error");
      return;
    }
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (cameraRequest) controllerRef.current?.focusScenario(cameraRequest);
  }, [cameraRequest]);

  useEffect(() => { controllerRef.current?.setMapTone(mapTone); }, [mapTone]);

  useEffect(() => {
    controllerRef.current?.setPanelsVisible(panelsVisible);
    if (previousPanelsVisible.current === panelsVisible) return;
    previousPanelsVisible.current = panelsVisible;
    if (panelsVisible) containerRef.current?.parentElement?.querySelector<HTMLButtonElement>(".panel-visibility")?.focus();
    else restoreButtonRef.current?.focus();
  }, [panelsVisible]);

  useEffect(() => {
    controllerRef.current?.cancelPendingLaunch();
  }, [cancelPendingVersion]);

  useEffect(() => {
    controllerRef.current?.setSceneFrame(frames, launch.multiLaunch, launch.activeZoneId, launch.effectView, launch.activeFalloutId, launch.activeAudibleId, launch.activeVisibleId);
  }, [frames, launch.multiLaunch, launch.activeZoneId, launch.effectView, launch.activeFalloutId, launch.activeAudibleId, launch.activeVisibleId]);

  const retryImagery = () => {
    const controller = controllerRef.current;
    if (!controller) {
      window.location.reload();
      return;
    }
    controller.retryImagery();
  };

  return (
    <main
      className={`simulator mode-${mapTone}${panelsVisible ? "" : " panels-hidden"}`}
      aria-label="Satellite map for Nuke Simulator"
      data-map-state={loadState}
      data-map-tone={mapTone}
      data-panels-visible={panelsVisible}
      data-center-longitude={camera.longitude.toFixed(6)}
      data-center-latitude={camera.latitude.toFixed(6)}
      data-zoom={camera.zoom.toFixed(3)}
      data-pitch={camera.pitch.toFixed(3)}
      data-bearing={camera.bearing.toFixed(3)}
      data-launch-phase={launch.phase}
      data-effect-view={launch.effectView}
      data-multi-launch={launch.multiLaunch}
      data-launch-count={frames.length}
      data-impact-count={frames.filter((frame) => frame.elapsedMs >= frame.launch.flightMs).length}
      data-launch-elapsed={Math.round(launch.elapsedMs)}
      data-target-longitude={launch.launch?.route.target.longitude.toFixed(6) ?? ""}
      data-target-latitude={launch.launch?.route.target.latitude.toFixed(6) ?? ""}
    >
      <div className="map-surface" ref={containerRef} aria-label="Interactive satellite map" />
      <div className="map-tone" aria-hidden="true" />
      <canvas className="blast-canvas" ref={blastCanvasRef} aria-hidden="true" />
      <canvas className="fireball-canvas" ref={fireballCanvasRef} aria-hidden="true" />
      <canvas className="missile-canvas" ref={missileCanvasRef} aria-hidden="true" />
      <canvas className="inspection-canvas" ref={inspectionCanvasRef} aria-hidden="true" />
      {launch.effectView === "blast" && <BlastInspectionOverlay geometry={inspection} activeZoneId={launch.activeZoneId} pinnedZoneId={launch.pinnedZoneId} onHover={onHoverZone} onFocusZone={onFocusZone} onPin={onPinZone} onClear={onClearZoneInspection} />}
      {launch.effectView === "blast" && launch.multiLaunch && (
        <MultiLaunchLegend scale={mapDistanceScale(camera.latitude, camera.zoom)} latestRadii={launch.launch?.radii ?? null}
          activeZoneId={launch.activeZoneId} pinnedZoneId={launch.pinnedZoneId} onHoverZone={onHoverZone}
          onFocusZone={onFocusZone} onPinZone={onPinZone} onClearZoneInspection={onClearZoneInspection} />
      )}
      {launch.effectView === "fallout" && (
        <FalloutInspectionOverlay
          geometry={falloutInspection} legendZones={falloutLegendZones}
          multi={launch.multiLaunch} scale={mapDistanceScale(camera.latitude, camera.zoom)}
          active={launch.activeFalloutId} pinned={launch.pinnedFalloutId}
          onHover={onHoverFallout} onFocus={onFocusFallout} onPin={onPinFallout} onClear={onClearFallout}
        />
      )}
      {launch.effectView === "audible" && (
        <AudibleInspectionOverlay geometry={audibleInspection} legendBands={audibleLegendBands}
          multi={launch.multiLaunch} scale={mapDistanceScale(camera.latitude, camera.zoom)}
          active={launch.activeAudibleId} pinned={launch.pinnedAudibleId}
          onHover={onHoverAudible} onFocus={onFocusAudible} onPin={onPinAudible} onClear={onClearAudible} />
      )}
      {launch.effectView === "visible" && (
        <VisibleInspectionOverlay geometry={visibleInspection} legendBands={visibleLegendBands}
          multi={launch.multiLaunch} scale={mapDistanceScale(camera.latitude, camera.zoom)}
          active={launch.activeVisibleId} pinned={launch.pinnedVisibleId}
          onHover={onHoverVisible} onFocus={onFocusVisible} onPin={onPinVisible} onClear={onClearVisible} />
      )}
      {launch.phase === "complete" && (
        <EffectViewSelector view={launch.effectView} falloutAvailable={falloutEligible} onSelect={onSelectEffectView} />
      )}
      <p className="model-qualification">
        {launch.effectView === "fallout"
          ? "SURFACE-BURST H+24 SCREENING ENVELOPE · CLIMATOLOGICAL WIND PROXY, NOT LIVE METEOROLOGY"
          : launch.effectView === "audible"
            ? "OUTDOOR LOW-FREQUENCY ESTIMATE · STANDARD ATMOSPHERE; WEATHER AND TERRAIN CAN DOMINATE"
          : launch.effectView === "visible"
            ? "DIRECT-FIREBALL HORIZON · 1.7 M OBSERVER · CLEAR AIR; CLOUD GLOW MAY CARRY FARTHER"
          : "IDEALIZED RADIAL SCALING · HYPOTHETICAL EXTREMES ARE ILLUSTRATIVE"}
      </p>
      {children}
      {!panelsVisible && <button ref={restoreButtonRef} className="panel-restore" type="button" onClick={() => onSetPanelsVisible(true)} aria-label="Show control and cloud panels"><EyeIcon /> SHOW CONTROLS</button>}
      {loadState === "loading" && (
        <div className="map-message" role="status">Loading satellite map…</div>
      )}
      {loadState === "imagery-error" && (
        <div className="map-message map-message-error" role="alert">
          <span>Satellite imagery is unavailable.</span>
          <button type="button" onClick={retryImagery}>Retry map</button>
        </div>
      )}
      {loadState === "map-error" && (
        <div className="map-message map-message-error" role="alert">
          <span>The map could not start.</span>
          <button type="button" onClick={() => window.location.reload()}>Reload map</button>
        </div>
      )}
      {launchError && <div className="map-message map-message-error" role="alert">{launchError}</div>}
    </main>
  );
}
