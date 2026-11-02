import type { ErrorEvent as MapErrorEvent, Map as MapLibreMap, MapSourceDataEvent } from "maplibre-gl";
import { MapCameraAdapter } from "./MapCameraAdapter";
import { createSatelliteMap } from "./createSatelliteMap";

/** Visible map readiness states. An imagery error leaves camera interaction available. */
export type MapLoadState = "loading" | "ready" | "imagery-error" | "map-error";

/** Camera data exposed to the UI in geographic degrees and MapLibre zoom units. */
export interface MapCameraSnapshot {
  readonly longitude: number;
  readonly latitude: number;
  readonly zoom: number;
}

/** Notifications from the map renderer; the UI does not receive MapLibre objects. */
export interface SatelliteMapCallbacks {
  readonly onStateChange: (state: MapLoadState) => void;
  readonly onCameraChange: (camera: MapCameraSnapshot) => void;
}

const IMAGERY_SOURCE_ID = "satellite";

/**
 * Owns MapLibre's lifecycle, camera events, and satellite-source recovery.
 * UI code can mount, retry, and dispose of the map without changing its style.
 */
export class SatelliteMapController {
  private readonly camera: MapCameraAdapter;
  private state: MapLoadState = "loading";
  private mapLoaded = false;
  private panelsVisible = true;

  constructor(private readonly map: MapLibreMap, private readonly callbacks: SatelliteMapCallbacks) {
    this.camera = new MapCameraAdapter(map);
    map.on("load", this.handleLoad);
    map.on("idle", this.handleIdle);
    map.on("moveend", this.emitCamera);
    map.on("error", this.handleError);
    map.on("sourcedata", this.handleSourceData);
    map.on("resize", this.updateCameraPadding);
    this.updateCameraPadding();
    this.emitCamera();
  }

  /** Keep the map's visual center clear of the left control panel. */
  setPanelsVisible(visible: boolean): void {
    this.panelsVisible = visible;
    this.updateCameraPadding();
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
    const { center, zoom } = this.camera.snapshot();
    this.callbacks.onCameraChange({ longitude: center.longitude, latitude: center.latitude, zoom });
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
): SatelliteMapController {
  return new SatelliteMapController(createSatelliteMap(container), callbacks);
}
