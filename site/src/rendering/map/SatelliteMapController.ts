import type { CustomLayerInterface, ErrorEvent as MapErrorEvent, Map as MapLibreMap, MapMouseEvent, MapSourceDataEvent } from "maplibre-gl";
import type { Launch, LaunchFrame, FlightRoute, LaunchIntent } from "../../application/launch";
import { MissileCanvasRenderer } from "../animation/MissileCanvasRenderer";
import { BlastCanvasRenderer } from "../effects/BlastCanvasRenderer";
import { MultiBlastCanvasRenderer } from "../effects/MultiBlastCanvasRenderer";
import { createFireballRenderer, type FireballCamera, type FireballRenderer } from "../animation/FireballRenderer";
import { viewportFlightRoute } from "../animation/flightGeometry";
import { projectedMirvPlan } from "../animation/mirvProjectionSafety";
import { MapCameraAdapter } from "./MapCameraAdapter";
import { createSatelliteMap } from "./createSatelliteMap";
import { normalizeLongitude, type GeoPoint } from "../../domain/geodesy";
import { FLIGHT_MS } from "../../application/launch";
import type { PreparedLaunch } from "../../application/launchPreparation";
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

interface PendingMapClick {
  readonly target: GeoPoint;
  readonly angle: number;
  readonly targets: readonly GeoPoint[] | null;
  readonly intent: LaunchIntent;
}

/** Notifications from the map renderer; the UI does not receive MapLibre objects. */
export interface SatelliteMapCallbacks {
  readonly onStateChange: (state: MapLoadState) => void;
  readonly onCameraChange: (camera: MapCameraSnapshot) => void;
  readonly onLaunch?: (route: FlightRoute, intent: LaunchIntent) => void;
  /** Freeze selected device and modeled targets at the geographic click. */
  readonly prepareLaunch?: (aim: GeoPoint) => PreparedLaunch | null;
  readonly launchAngle?: () => number;
  /** Inform controls that a geographic target is waiting for camera framing. */
  readonly onPendingChange?: (pending: boolean) => void;
  /** Explain when no safe camera and carrier route can be found. */
  readonly onLaunchUnavailable?: (message: string | null) => void;
  readonly onInspectionChange?: (geometry: BlastInspectionGeometry | null) => void;
  /** Return the lower edge of controls covering the narrow map, in CSS pixels from its top. */
  readonly clearMapTopPx?: () => number;
}

const IMAGERY_SOURCE_ID = "satellite";
const FIREBALL_LAYER_ID = "fireball-camera";

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
  private sceneFrames: readonly LaunchFrame[] = [];
  private multiLaunch = false;
  private highlightedZoneId: BlastZoneId | null = null;
  private inspection: BlastInspectionGeometry | null = null;
  private fireballFailed = false;
  private fireballMatrix: Float64Array | null = null;
  private fireballCamera: FireballCamera | null = null;
  private lastFramedMirvGroupId: number | null = null;
  private pendingClicks: PendingMapClick[] = [];
  private pendingFrameAttempt = 0;

  constructor(private readonly map: MapLibreMap, private readonly callbacks: SatelliteMapCallbacks, private readonly missileRenderer?: MissileCanvasRenderer, private readonly blastRenderer?: BlastCanvasRenderer, private readonly fireballRenderer?: FireballRenderer | null, private readonly multiBlastRenderer?: MultiBlastCanvasRenderer) {
    this.camera = new MapCameraAdapter(map);
    map.on("load", this.handleLoad);
    map.on("idle", this.handleIdle);
    map.on("moveend", this.emitCamera);
    map.on("moveend", this.finishPendingMirv);
    map.on("error", this.handleError);
    map.on("sourcedata", this.handleSourceData);
    map.on("resize", this.updateCameraPadding);
    map.on("resize", this.repaintCamera);
    map.on("move", this.repaintCamera);
    map.on("click", this.handleMapClick);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("focus", this.handleResume);
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
    this.setSceneFrame(launch ? [{ launch, elapsedMs }] : [], false, highlightedZoneId);
  }

  /** Draw all click groups; turning multi mode off restores one group's ruler. */
  setSceneFrame(frames: readonly LaunchFrame[], multiLaunch: boolean, highlightedZoneId: BlastZoneId | null = null): void {
    const latest = frames.at(-1);
    if (!latest || (this.launch && this.launch.id !== latest.launch.id) || this.multiLaunch !== multiLaunch) this.fireballRenderer?.clear();
    this.sceneFrames = frames;
    this.multiLaunch = multiLaunch;
    this.launch = latest?.launch ?? null;
    this.elapsedMs = latest?.elapsedMs ?? 0;
    this.highlightedZoneId = highlightedZoneId;
    this.frameHiddenNarrowMirv(frames);
    this.repaintFlight();
    if (this.fireballRenderer && !this.fireballFailed) {
      if (this.fireballMatrix) this.repaintFireball();
      else this.map.triggerRepaint();
    }
  }

  /**
   * On a narrow screen only, reveal a new MIRV group's impact centers if its
   * spread falls behind the control stack or outside the viewport. The model's
   * geographic targets and routes stay fixed while MapLibre eases the camera.
   */
  private frameHiddenNarrowMirv(frames: readonly LaunchFrame[]): void {
    const container = this.map.getContainer();
    if (container.clientWidth >= 600 || !frames.at(-1)?.launch.mirv) return;
    let leadIndex = frames.length - 1;
    while (leadIndex > 0 && !frames[leadIndex]!.launch.mirv?.lead) leadIndex -= 1;
    const lead = frames[leadIndex]?.launch;
    if (!lead?.mirv || this.lastFramedMirvGroupId === lead.id) return;
    this.lastFramedMirvGroupId = lead.id;
    const group = frames.slice(leadIndex);
    const clearTop = Math.min(container.clientHeight - 100,
      Math.max(16, this.panelsVisible ? this.callbacks.clearMapTopPx?.() ?? 80 : 16));
    const visible = group.filter(({ launch }) => {
      const point = this.camera.toScreen(launch.route.target);
      return point.x >= 16 && point.x <= container.clientWidth - 16 && point.y >= clearTop && point.y <= container.clientHeight - 75;
    }).length;
    if (visible >= 2) return;

    const aim = lead.mirv.route.target;
    const points = [aim, ...group.map(({ launch }) => launch.route.target)];
    const longitudes = points.map((point) => aim.longitude + normalizeLongitude(point.longitude - aim.longitude));
    const west = Math.min(...longitudes);
    const east = Math.max(...longitudes);
    const south = Math.min(...points.map((point) => point.latitude));
    const north = Math.max(...points.map((point) => point.latitude));
    const longitudeMargin = Math.max(0.002, (east - west) * 0.08);
    const latitudeMargin = Math.max(0.002, (north - south) * 0.08);
    try {
      this.map.fitBounds([[west - longitudeMargin, south - latitudeMargin], [east + longitudeMargin, north + latitudeMargin]], {
        padding: { top: clearTop, right: 24, bottom: 75, left: 24 },
        maxZoom: this.map.getZoom(),
        duration: 650,
      });
    } catch (error) {
      console.warn("Unable to frame narrow MIRV impacts; geographic launch remains available.", error);
    }
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

  /** Cancel all targets still waiting for MIRV framing, including queued multi clicks. */
  cancelPendingLaunch(): void {
    if (this.pendingClicks.length === 0) return;
    this.pendingClicks = [];
    this.pendingFrameAttempt = 0;
    this.callbacks.onPendingChange?.(false);
    this.map.stop();
    this.repaintFlight();
  }

  /** Remove listeners and release the MapLibre instance owned by this controller. */
  dispose(): void {
    this.map.off("load", this.handleLoad);
    this.map.off("idle", this.handleIdle);
    this.map.off("moveend", this.emitCamera);
    this.map.off("moveend", this.finishPendingMirv);
    this.map.off("error", this.handleError);
    this.map.off("sourcedata", this.handleSourceData);
    this.map.off("resize", this.updateCameraPadding);
    this.map.off("resize", this.repaintCamera);
    this.map.off("move", this.repaintCamera);
    this.map.off("click", this.handleMapClick);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("focus", this.handleResume);
    this.cancelPendingLaunch();
    this.multiBlastRenderer?.dispose();
    this.fireballRenderer?.dispose();
    this.map.remove();
  }

  private readonly handleLoad = (): void => {
    this.mapLoaded = true;
    this.addFireballLayer();
    this.emitCamera();
  };

  /** Use MapLibre's exact camera matrix to repaint an independent WebGL canvas. */
  private addFireballLayer(): void {
    if (!this.fireballRenderer) return;
    const layer: CustomLayerInterface = {
      id: FIREBALL_LAYER_ID,
      type: "custom",
      renderingMode: "2d",
      render: (_gl, options) => {
        if (this.fireballFailed) return;
        this.fireballMatrix = new Float64Array(options.defaultProjectionData.mainMatrix);
        this.fireballCamera = { longitude: this.map.getCenter().lng, zoom: this.map.getZoom() };
        this.repaintFireball();
      },
    };
    try {
      this.map.addLayer(layer);
    } catch (error) {
      this.fireballFailed = true;
      this.fireballRenderer.clear();
      console.warn("Unable to attach the 3D fireball; 2D blast remains available.", error);
    }
  }

  /** Reuse the latest camera matrix between map frames; only the small WebGL canvas changes. */
  private repaintFireball(): void {
    if (!this.fireballRenderer || !this.fireballMatrix || !this.fireballCamera || this.fireballFailed) return;
    try {
      const container = this.map.getContainer();
      if (this.multiLaunch || this.sceneFrames.length > 1) this.fireballRenderer.renderMany(this.fireballMatrix, this.fireballCamera, this.sceneFrames, container.clientWidth, container.clientHeight);
      else this.fireballRenderer.render(this.fireballMatrix, this.fireballCamera, this.launch, this.elapsedMs, container.clientWidth, container.clientHeight);
    } catch (error) {
      this.fireballFailed = true;
      this.fireballRenderer.clear();
      console.warn("Unable to draw the 3D fireball; 2D blast remains available.", error);
    }
  }

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
    const groupedSingle = !this.multiLaunch && this.sceneFrames.length > 1;
    if (this.multiLaunch || groupedSingle) this.multiBlastRenderer?.render(this.sceneFrames, container.clientWidth, container.clientHeight, this.multiLaunch);
    const inspection = this.multiLaunch ? null : groupedSingle
      ? this.blastRenderer?.renderInspectionOnly(this.launch, this.elapsedMs, container.clientWidth, container.clientHeight, this.highlightedZoneId) ?? null
      : this.blastRenderer?.render(this.launch, this.elapsedMs, container.clientWidth, container.clientHeight, this.highlightedZoneId) ?? null;
    if (inspection !== this.inspection) {
      this.inspection = inspection;
      this.callbacks.onInspectionChange?.(inspection);
    }
    if (this.multiLaunch || groupedSingle) this.missileRenderer?.renderMany(this.sceneFrames, container.clientWidth, container.clientHeight);
    else this.missileRenderer?.render(this.launch, this.elapsedMs, container.clientWidth, container.clientHeight);
    for (const click of this.pendingClicks) this.missileRenderer?.paintPendingTarget(click.target);
  };

  private readonly repaintCamera = (): void => {
    this.invalidateFireballProjection();
    this.blastRenderer?.invalidateProjection();
    this.multiBlastRenderer?.invalidateProjection();
    this.repaintFlight();
    if (this.fireballRenderer && !this.fireballFailed && !document.hidden) this.map.triggerRepaint();
    // The map-distance instrument follows the same moving camera frame as the
    // geographic field, including animated zoom and container resize.
    this.emitCamera();
  };

  /** Never combine a matrix from an older map frame with a newer camera. */
  private invalidateFireballProjection(): void {
    if (!this.fireballMatrix) return;
    this.fireballMatrix = null;
    this.fireballCamera = null;
    this.fireballRenderer?.clear();
  }

  /** Drop stale pixels while the map's render loop may be suspended. */
  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) this.invalidateFireballProjection();
    else this.handleResume();
  };

  /** Force a fresh MapLibre matrix after tab or application focus returns. */
  private readonly handleResume = (): void => {
    if (document.hidden) return;
    this.invalidateFireballProjection();
    this.map.resize();
    if (this.fireballRenderer && !this.fireballFailed) this.map.triggerRepaint();
  };

  private readonly handleMapClick = (event: MapMouseEvent): void => {
    const targetElement = event.originalEvent.target;
    if (typeof Element !== "undefined" && targetElement instanceof Element && targetElement.closest(".maplibregl-ctrl, .maplibregl-control-container")) return;
    const container = this.map.getContainer();
    if (container.clientWidth <= 0 || container.clientHeight <= 0) return;
    const aim = { x: event.point.x, y: event.point.y };
    const angle = this.callbacks.launchAngle?.() ?? -Math.PI / 4;
    if (!Number.isFinite(angle)) return;
    const target = this.camera.toGeo(aim);
    this.callbacks.onLaunchUnavailable?.(null);
    const prepared = this.callbacks.prepareLaunch?.(target) ?? null;
    if (!prepared) return;
    const { intent, mirvTargets: targets } = prepared;
    if (this.pendingClicks.length > 0) {
      if (this.multiLaunch) this.pendingClicks.push({ target, angle, targets, intent });
      else {
        this.pendingClicks = [];
        this.map.stop();
        this.pendingFrameAttempt = 0;
        if (!targets) {
          this.callbacks.onPendingChange?.(false);
          this.callbacks.onLaunch?.(this.geographicFlightRoute(aim, target, angle, false), intent);
          this.repaintFlight();
          return;
        }
        this.pendingClicks = [{ target, angle, targets, intent }];
        this.framePendingMirv();
      }
      this.repaintFlight();
      return;
    }
    if (!targets) {
      this.callbacks.onLaunch?.(this.geographicFlightRoute(aim, target, angle, false), intent);
      return;
    }
    const click = { target, angle, targets, intent };
    const route = this.safeMirvRoute(click);
    if (route) this.callbacks.onLaunch?.(route, intent);
    else {
      this.pendingClicks = [click];
      this.pendingFrameAttempt = 0;
      this.callbacks.onPendingChange?.(true);
      this.repaintFlight();
      this.framePendingMirv();
    }
  };

  /** Convert the current camera's visible entry into a stored geographic route. */
  private geographicFlightRoute(aim: { x: number; y: number }, target: GeoPoint, angle: number, mirv: boolean): FlightRoute {
    const container = this.map.getContainer();
    const edge = viewportFlightRoute(container.clientWidth, container.clientHeight, aim, angle, mirv);
    return { start: this.camera.toGeo(edge.start), control: this.camera.toGeo(edge.control), target };
  }

  /** Try same-side entries against the actual pitched/rotated map projection. */
  private safeMirvRoute(click: PendingMapClick): FlightRoute | null {
    if (!click.targets) return null;
    const container = this.map.getContainer();
    const aim = this.camera.toScreen(click.target);
    const targets = click.targets;
    const spreadVisible = targets.every((target) => {
      const point = this.camera.toScreen(target);
      return point.x >= 8 && point.x <= container.clientWidth - 8 && point.y >= 8 && point.y <= container.clientHeight - 8;
    });
    if (!spreadVisible && this.map.getZoom() >= 12.5) return null;
    for (const offset of [0, -Math.PI / 8, Math.PI / 8, -Math.PI / 4, Math.PI / 4]) {
      const route = this.geographicFlightRoute(aim, click.target, click.angle + offset, true);
      let result;
      try {
        result = projectedMirvPlan(route, targets, this.camera, FLIGHT_MS, 45, container.clientWidth, container.clientHeight);
      } catch {
        continue;
      }
      if (result.safe) return route;
    }
    return null;
  }

  /** Include all modeled impacts in a deliberate map ease before routing. */
  private framePendingMirv(): void {
    const click = this.pendingClicks[0];
    if (!click) return;
    if (!click.targets) {
      this.dispatchQueuedSingleClicks();
      return;
    }
    const points = [click.target, ...click.targets];
    const longitudes = points.map((point) => click.target.longitude + normalizeLongitude(point.longitude - click.target.longitude));
    const west = Math.min(...longitudes);
    const east = Math.max(...longitudes);
    const south = Math.min(...points.map((point) => point.latitude));
    const north = Math.max(...points.map((point) => point.latitude));
    const container = this.map.getContainer();
    const shorterSide = Math.min(container.clientWidth, container.clientHeight);
    const inset = Math.min(shorterSide * 0.4, Math.max(24, shorterSide * (0.16 + this.pendingFrameAttempt * 0.07)));
    // A route that failed the pitch-safe check needs more entry runway even
    // when all impacts already fit the current viewport.
    const initialMaxZoom = Math.min(this.map.getZoom(), 9.5);
    try {
      this.map.fitBounds([[west, south], [east, north]], {
        padding: { top: inset, right: inset, bottom: inset, left: inset },
        maxZoom: Math.max(0.75, initialMaxZoom - this.pendingFrameAttempt * 1.25),
        duration: 450,
      });
    } catch {
      this.failPendingMirv();
    }
  }

  /** Leave the map interactive and report a bounded framing failure. */
  private failPendingMirv(): void {
    this.pendingClicks.shift();
    this.pendingFrameAttempt = 0;
    this.callbacks.onLaunchUnavailable?.("Could not frame this MIRV launch. Zoom out and try again.");
    if (this.pendingClicks.length > 0) this.dispatchQueuedSingleClicks();
    else {
      this.callbacks.onPendingChange?.(false);
      this.repaintFlight();
    }
  }

  /** Complete queued single-device clicks after the preceding MIRV camera ease. */
  private dispatchQueuedSingleClicks(): void {
    while (this.pendingClicks[0] && !this.pendingClicks[0].targets) {
      const click = this.pendingClicks.shift()!;
      this.callbacks.onLaunch?.(this.geographicFlightRoute(this.camera.toScreen(click.target), click.target, click.angle, false), click.intent);
    }
    if (this.pendingClicks.length > 0) this.framePendingMirv();
    else this.callbacks.onPendingChange?.(false);
    this.repaintFlight();
  }

  /** Launch queued clicks in order after each camera ease reaches a safe route. */
  private readonly finishPendingMirv = (): void => {
    const click = this.pendingClicks[0];
    if (!click) return;
    if (!click.targets) {
      this.dispatchQueuedSingleClicks();
      return;
    }
    const route = this.safeMirvRoute(click);
    if (!route && this.pendingFrameAttempt < 6) {
      this.pendingFrameAttempt += 1;
      this.framePendingMirv();
      return;
    }
    if (!route) {
      this.failPendingMirv();
      return;
    }
    this.pendingClicks.shift();
    this.pendingFrameAttempt = 0;
    this.callbacks.onLaunch?.(route, click.intent);
    if (this.pendingClicks.length > 0) this.dispatchQueuedSingleClicks();
    else this.callbacks.onPendingChange?.(false);
    this.repaintFlight();
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
  fireballCanvas?: HTMLCanvasElement,
  inspectionCanvas?: HTMLCanvasElement,
): SatelliteMapController {
  const map = createSatelliteMap(container);
  const camera = new MapCameraAdapter(map);
  const missile = missileCanvas ? new MissileCanvasRenderer(missileCanvas, camera) : undefined;
  const blast = blastCanvas ? new BlastCanvasRenderer(blastCanvas, camera, inspectionCanvas) : undefined;
  const multiBlast = blastCanvas ? new MultiBlastCanvasRenderer(blastCanvas, camera, inspectionCanvas) : undefined;
  const fireball = fireballCanvas ? createFireballRenderer(fireballCanvas, () => map.triggerRepaint()) : undefined;
  return new SatelliteMapController(map, callbacks, missile, blast, fireball, multiBlast);
}
