import type { ErrorEvent as MapErrorEvent, Map as MapLibreMap, MapMouseEvent, MapSourceDataEvent } from "maplibre-gl";
import type { Launch, FlightRoute } from "../../application/launch";
import { MissileCanvasRenderer } from "../animation/MissileCanvasRenderer";
import { BlastCanvasRenderer } from "../effects/BlastCanvasRenderer";
import { viewportFlightRoute } from "../animation/flightGeometry";
import { MapCameraAdapter } from "./MapCameraAdapter";
import { createSatelliteMap } from "./createSatelliteMap";
import type { GeoPoint } from "../../domain/geodesy";
import type { BlastZoneId } from "../../domain/blastZones";
import type { BlastInspectionGeometry } from "../overlays/blastInspection";

/** Visible map readiness states. An imagery error leaves camera interaction available. */
export type MapLoadState = "loading" | "ready" | "imagery-error" | "map-error";

/** Camera data exposed to the UI in geographic degrees and MapLibre zoom units. */
export interface MapCameraSnapshot {
  readonly longitude: number;
  readonly latitude: number;
  readonly zoom: number;
  readonly pitch: number;
  readonly bearing: number;
}

/** Notifications from the map renderer; the UI does not receive MapLibre objects. */
export interface SatelliteMapCallbacks {
  readonly onStateChange: (state: MapLoadState) => void;
  readonly onCameraChange: (camera: MapCameraSnapshot) => void;
  readonly onLaunch?: (route: FlightRoute) => void;
  readonly launchAngle?: () => number;
  readonly onInspectionChange?: (geometry: BlastInspectionGeometry | null) => void;
}

const IMAGERY_SOURCE_ID = "satellite";

/** Compute the prototype's map zoom for a horizon in km and viewport in CSS pixels. */
export function scenarioZoom(horizonKm: number, latitude: number, width: number, height: number): number {
  const usableWidth = width > 900 ? width - 380 : width;
  const targetPixels = Math.max(100, Math.min(usableWidth, height) * 0.34);
  const latitudeScale = Math.max(0.04, Math.cos(latitude * Math.PI / 180));
  const zoom = Math.log2((156543.03392 * latitudeScale * targetPixels) / (Math.max(0.001, horizonKm) * 1000));
  return Math.max(0.75, Math.min(13, zoom));
}

/**
 * Owns MapLibre's lifecycle, camera events, and satellite-source recovery.
 * UI code can mount, retry, and dispose of the map without changing its style.
 */
export class SatelliteMapController {
  private readonly camera: MapCameraAdapter;
  private state: MapLoadState = "loading";
  private mapLoaded = false;
  private panelsVisible = true;
  private launch: Launch | null = null;
  private elapsedMs = 0;
  private highlightedZoneId: BlastZoneId | null = null;
  private inspection: BlastInspectionGeometry | null = null;

  constructor(private readonly map: MapLibreMap, private readonly callbacks: SatelliteMapCallbacks, private readonly missileRenderer?: MissileCanvasRenderer, private readonly blastRenderer?: BlastCanvasRenderer) {
    this.camera = new MapCameraAdapter(map);
    map.on("load", this.handleLoad);
    map.on("idle", this.handleIdle);
    map.on("moveend", this.emitCamera);
    map.on("error", this.handleError);
    map.on("sourcedata", this.handleSourceData);
    map.on("resize", this.updateCameraPadding);
    map.on("resize", this.repaintCamera);
    map.on("move", this.repaintCamera);
    map.on("click", this.handleMapClick);
    this.updateCameraPadding();
    this.emitCamera();
  }

  /** Keep the map's visual center clear of the left control panel. */
  setPanelsVisible(visible: boolean): void {
    this.panelsVisible = visible;
    this.updateCameraPadding();
  }

  /** Draw a single launch at its injected age in milliseconds. */
  setFlightFrame(launch: Launch | null, elapsedMs: number, highlightedZoneId: BlastZoneId | null = null): void {
    this.launch = launch;
    this.elapsedMs = elapsedMs;
    this.highlightedZoneId = highlightedZoneId;
    this.repaintFlight();
  }

  /** Ease to a geographic center and frame its supplied horizon without creating a strike. */
  focusScenario(target: { readonly center: GeoPoint; readonly horizonKm: number }): void {
    const container = this.map.getContainer();
    const zoom = scenarioZoom(target.horizonKm, target.center.latitude, container.clientWidth, container.clientHeight);
    this.map.stop();
    // A distant destination may have no cached tiles; wait for its imagery to settle.
    if (this.state !== "map-error") this.setState("loading");
    this.map.easeTo({ center: [target.center.longitude, target.center.latitude], zoom, duration: 650 });
  }

  /** Retry only the satellite tiles, preserving future effect sources and layers. */
  retryImagery(): void {
    this.setState("loading");
    try {
      this.map.refreshTiles(IMAGERY_SOURCE_ID);
    } catch (error) {
      console.error("Satellite imagery retry failed", error);
      this.setState("imagery-error");
    }
  }

  /** Remove listeners and release the MapLibre instance owned by this controller. */
  dispose(): void {
    this.map.off("load", this.handleLoad);
    this.map.off("idle", this.handleIdle);
    this.map.off("moveend", this.emitCamera);
    this.map.off("error", this.handleError);
    this.map.off("sourcedata", this.handleSourceData);
    this.map.off("resize", this.updateCameraPadding);
    this.map.off("resize", this.repaintCamera);
    this.map.off("move", this.repaintCamera);
    this.map.off("click", this.handleMapClick);
    this.map.remove();
  }

  private readonly handleLoad = (): void => {
    this.mapLoaded = true;
    this.emitCamera();
  };

  private readonly handleIdle = (): void => {
    if (this.state === "loading" && this.map.isSourceLoaded(IMAGERY_SOURCE_ID)) {
      this.setState("ready");
    }
  };

  private readonly emitCamera = (): void => {
    const { center, zoom, pitch, bearing } = this.camera.snapshot();
    this.callbacks.onCameraChange({ longitude: center.longitude, latitude: center.latitude, zoom, pitch, bearing });
  };

  private readonly repaintFlight = (): void => {
    const container = this.map.getContainer();
    const inspection = this.blastRenderer?.render(this.launch, this.elapsedMs, container.clientWidth, container.clientHeight, this.highlightedZoneId) ?? null;
    if (inspection !== this.inspection) {
      this.inspection = inspection;
      this.callbacks.onInspectionChange?.(inspection);
    }
    this.missileRenderer?.render(this.launch, this.elapsedMs, container.clientWidth, container.clientHeight);
  };

  private readonly repaintCamera = (): void => {
    this.blastRenderer?.invalidateProjection();
    this.repaintFlight();
  };

  private readonly handleMapClick = (event: MapMouseEvent): void => {
    const targetElement = event.originalEvent.target;
    if (typeof Element !== "undefined" && targetElement instanceof Element && targetElement.closest(".maplibregl-ctrl, .maplibregl-control-container")) return;
    const container = this.map.getContainer();
    if (container.clientWidth <= 0 || container.clientHeight <= 0) return;
    const aim = { x: event.point.x, y: event.point.y };
    const angle = this.callbacks.launchAngle?.() ?? -Math.PI / 4;
    if (!Number.isFinite(angle)) return;
    const route = viewportFlightRoute(container.clientWidth, container.clientHeight, aim, angle);
    this.callbacks.onLaunch?.({
      start: this.camera.toGeo(route.start),
      control: this.camera.toGeo(route.control),
      target: this.camera.toGeo(aim),
    });
  };

  private readonly updateCameraPadding = (): void => {
    const desktop = this.map.getContainer().clientWidth > 900;
    this.map.setPadding(this.panelsVisible
      ? desktop ? { top: 0, right: 0, bottom: 0, left: 380 } : { top: 80, right: 0, bottom: 0, left: 0 }
      : { top: 0, right: 0, bottom: 0, left: 0 });
  };

  private readonly handleError = (event: MapErrorEvent): void => {
    console.error("Satellite map error", event.error);
    const sourceId = "sourceId" in event ? event.sourceId : undefined;
    if (sourceId === IMAGERY_SOURCE_ID) {
      this.setState("imagery-error");
    } else if (!this.mapLoaded) {
      this.setState("map-error");
    }
  };

  private readonly handleSourceData = (event: MapSourceDataEvent): void => {
    // MapLibre's successful tile event carries `tile` but leaves sourceDataType unset.
    if (event.sourceId !== IMAGERY_SOURCE_ID || event.tile?.state !== "loaded") return;
    if (this.state === "imagery-error") this.setState("loading");
  };

  private setState(next: MapLoadState): void {
    if (this.state === next) return;
    this.state = next;
    this.callbacks.onStateChange(next);
  }
}

/** Create a satellite map behind the rendering boundary. Caller must dispose it. */
export function createSatelliteMapController(
  container: HTMLElement,
  callbacks: SatelliteMapCallbacks,
  missileCanvas?: HTMLCanvasElement,
  blastCanvas?: HTMLCanvasElement,
): SatelliteMapController {
  const map = createSatelliteMap(container);
  const camera = new MapCameraAdapter(map);
  const missile = missileCanvas ? new MissileCanvasRenderer(missileCanvas, camera) : undefined;
  const blast = blastCanvas ? new BlastCanvasRenderer(blastCanvas, camera) : undefined;
  return new SatelliteMapController(map, callbacks, missile, blast);
}
