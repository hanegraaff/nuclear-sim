import type { Launch } from "../../application/launch";
import type { BlastRadii } from "../../domain/blast";
import type { BlastZoneId } from "../../domain/blastZones";
import type { MapCameraAdapter } from "../map/MapCameraAdapter";
import { buildBlastDistanceGrid, type BlastDistanceGrid } from "./blastFieldGeometry";
import { BlastOpticalEffects } from "./BlastOpticalEffects";
import { blastColorAnchors, colorAtDistance } from "./blastPalette";
export { blastColor } from "./blastPalette";
import { blastExpansion } from "../animation/blastTiming";
import { buildBlastInspection, drawBlastInspection, selectBlastRulerBearing, type BlastInspectionGeometry } from "../overlays/blastInspection";

export { blastExpansion } from "../animation/blastTiming";

const FALLOFF_FACTOR = 1.24;

interface CachedBlastField {
  readonly launchId: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly grid: BlastDistanceGrid;
  readonly colors: Uint8ClampedArray;
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly image: ImageData;
}

/** Paints one geographic blast on a transparent Canvas 2D overlay. */
export class BlastCanvasRenderer {
  private field: CachedBlastField | null = null;
  private inspectionBearing: { readonly launchId: number; readonly degrees: number } | null = null;

  private readonly optics: BlastOpticalEffects;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly camera: MapCameraAdapter, private readonly inspectionCanvas?: HTMLCanvasElement) { this.optics = new BlastOpticalEffects(camera); }

  /** Drop sampled distances when pan, zoom, pitch, rotation, or resize changes the camera. */
  invalidateProjection(): void {
    this.field = null;
    this.optics.invalidateProjection();
  }

  /** Reproject and repaint at launch age in ms and CSS viewport dimensions; optionally suppress inspection for multi mode, returning settled marker geometry otherwise. */
  render(launch: Launch | null, elapsedMs: number, width: number, height: number, highlightedZoneId: BlastZoneId | null, showInspection = true): BlastInspectionGeometry | null {
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    const context = this.canvas.getContext("2d");
    if (!context) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    let inspectionContext = context;
    if (this.inspectionCanvas) {
      if (this.inspectionCanvas.width !== pixelWidth || this.inspectionCanvas.height !== pixelHeight) {
        this.inspectionCanvas.width = pixelWidth;
        this.inspectionCanvas.height = pixelHeight;
      }
      const overlay = this.inspectionCanvas.getContext("2d");
      if (overlay) {
        overlay.setTransform(ratio, 0, 0, ratio, 0, 0);
        overlay.clearRect(0, 0, width, height);
        inspectionContext = overlay;
      }
    }
    if (!launch || elapsedMs < launch.flightMs || width <= 0 || height <= 0) {
      if (!launch) { this.field = null; this.inspectionBearing = null; }
      return null;
    }

    const blastAge = Math.max(0, elapsedMs - launch.flightMs);
    const progress = Math.min(1, blastAge / launch.blastMs);
    const travelledKm = launch.radii.light * blastExpansion(progress);
    let field: CachedBlastField | null = null;
    if (travelledKm > 0) {
      field = this.ensureField(launch, width, height);
      if (field) this.drawField(context, field, travelledKm, launch.radii);
    }
    this.optics.paint(context, launch, elapsedMs, width, height, field ? { viewportWidth: width, viewportHeight: height, sample: () => field.grid } : null);
    if (progress < 1 || !showInspection) return null;
    return this.paintSettledInspection(launch, width, height, highlightedZoneId, inspectionContext);
  }

  /** Keep the latest group's ruler and markers above a combined multi-warhead field. */
  renderInspectionOnly(launch: Launch | null, elapsedMs: number, width: number, height: number, highlightedZoneId: BlastZoneId | null): BlastInspectionGeometry | null {
    const canvas = this.inspectionCanvas;
    if (!canvas) return null;
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!launch || elapsedMs < launch.flightMs + launch.blastMs || width <= 0 || height <= 0) return null;
    return this.paintSettledInspection(launch, width, height, highlightedZoneId, context);
  }

  /** Reuse the latest geographic bearing when only presentation changes. */
  private paintSettledInspection(launch: Launch, width: number, height: number, highlightedZoneId: BlastZoneId | null, context: CanvasRenderingContext2D): BlastInspectionGeometry | null {
    if (this.inspectionBearing?.launchId !== launch.id) {
      this.inspectionBearing = {
        launchId: launch.id,
        degrees: selectBlastRulerBearing(this.camera, launch.route.target, launch.radii.light, width, height),
      };
    }
    const inspection = buildBlastInspection(this.camera, launch.route.target, launch.radii, width, height, this.inspectionBearing.degrees);
    if (inspection) drawBlastInspection(context, inspection, highlightedZoneId);
    return inspection;
  }

  /** Build the visible geographic distance mask once per strike and camera state. */
  private ensureField(launch: Launch, width: number, height: number): CachedBlastField | null {
    if (this.field?.launchId === launch.id && this.field.viewportWidth === width && this.field.viewportHeight === height) return this.field;
    const grid = buildBlastDistanceGrid(this.camera, launch.route.target, width, height);
    const canvas = document.createElement("canvas");
    canvas.width = grid.width;
    canvas.height = grid.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const image = context.createImageData(grid.width, grid.height);
    const colors = new Uint8ClampedArray(grid.distancesKm.length * 4);
    const anchors = blastColorAnchors(launch.radii);
    for (let index = 0; index < grid.distancesKm.length; index++) {
      const distance = grid.distancesKm[index]!;
      if (!Number.isFinite(distance) || distance > launch.radii.light) continue;
      const color = colorAtDistance(distance, anchors);
      const offset = index * 4;
      colors[offset] = color.red;
      colors[offset + 1] = color.green;
      colors[offset + 2] = color.blue;
      colors[offset + 3] = Math.round(color.alpha * 255);
    }
    this.field = { launchId: launch.id, viewportWidth: width, viewportHeight: height, grid, colors, canvas, context, image };
    return this.field;
  }

  /** Paint exact color anchors at sampled geodesic distances and feather the edge. */
  private drawField(context: CanvasRenderingContext2D, field: CachedBlastField, travelledKm: number, radii: BlastRadii): void {
    const data = field.image.data;
    const falloffOuterKm = travelledKm * FALLOFF_FACTOR;
    for (let index = 0; index < field.grid.distancesKm.length; index++) {
      const distance = field.grid.distancesKm[index]!;
      const offset = index * 4;
      if (distance <= travelledKm) {
        data[offset] = field.colors[offset]!;
        data[offset + 1] = field.colors[offset + 1]!;
        data[offset + 2] = field.colors[offset + 2]!;
        data[offset + 3] = field.colors[offset + 3]!;
      } else if (distance <= Math.min(falloffOuterKm, radii.light * FALLOFF_FACTOR)) {
        const fraction = (distance - travelledKm) / Math.max(0.000001, falloffOuterKm - travelledKm);
        const fade = 1 - fraction * fraction * (3 - 2 * fraction);
        data[offset] = 112;
        data[offset + 1] = 73;
        data[offset + 2] = 201;
        data[offset + 3] = Math.round(76 * fade);
      } else {
        data[offset + 3] = 0;
      }
    }
    field.context.putImageData(field.image, 0, 0);
    context.save();
    context.imageSmoothingEnabled = true;
    context.drawImage(field.canvas, 0, 0, field.viewportWidth, field.viewportHeight);
    context.restore();
  }

}
