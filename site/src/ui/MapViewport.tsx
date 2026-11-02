import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FlightRoute, SimulatorState } from "../application/launch";
import type { ScenarioCameraRequest } from "../application/scenarioSelection";
import { INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from "../rendering/map/createSatelliteMap";
import {
  createSatelliteMapController,
  type MapLoadState,
  type SatelliteMapController,
} from "../rendering/map/SatelliteMapController";

/** Full-viewport map mount that places controls above imagery and map feedback. */
export function MapViewport({ children, cameraRequest, launch, onLaunch }: { readonly children?: ReactNode; readonly cameraRequest: ScenarioCameraRequest | null; readonly launch: Pick<SimulatorState, "phase" | "launch" | "elapsedMs">; readonly onLaunch: (route: FlightRoute) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const missileCanvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<SatelliteMapController | null>(null);
  const onLaunchRef = useRef(onLaunch);
  onLaunchRef.current = onLaunch;
  const [loadState, setLoadState] = useState<MapLoadState>("loading");
  const [camera, setCamera] = useState({
    longitude: INITIAL_MAP_CENTER.longitude,
    latitude: INITIAL_MAP_CENTER.latitude,
    zoom: INITIAL_MAP_ZOOM,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !missileCanvasRef.current) return;
    let controller: SatelliteMapController;
    try {
      controller = createSatelliteMapController(container, {
        onStateChange: setLoadState,
        onCameraChange: setCamera,
        onLaunch: (route) => onLaunchRef.current(route),
      }, missileCanvasRef.current);
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

  useEffect(() => {
    controllerRef.current?.setFlightFrame(launch.launch, launch.elapsedMs);
  }, [launch.launch, launch.elapsedMs]);

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
      className="simulator"
      aria-label="Satellite map for Nuke Simulator"
      data-map-state={loadState}
      data-center-longitude={camera.longitude.toFixed(6)}
      data-center-latitude={camera.latitude.toFixed(6)}
      data-zoom={camera.zoom.toFixed(3)}
      data-launch-phase={launch.phase}
      data-launch-elapsed={Math.round(launch.elapsedMs)}
      data-target-longitude={launch.launch?.route.target.longitude.toFixed(6) ?? ""}
      data-target-latitude={launch.launch?.route.target.latitude.toFixed(6) ?? ""}
    >
      <div className="map-surface" ref={containerRef} aria-label="Interactive satellite map" />
      <div className="map-tone" aria-hidden="true" />
      <canvas className="missile-canvas" ref={missileCanvasRef} aria-hidden="true" />
      {children}
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
    </main>
  );
}
