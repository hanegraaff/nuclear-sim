import type { LaunchFrame } from "../../application/launch";
import { audibleRadiusForLaunch } from "../../application/effectPresentation";
import { audibleIntensity, type AudibleBandId } from "../../domain/audible";
import { surfaceDistanceKm } from "../../domain/geodesy";
import { combineBlastPeakAndSum } from "../../domain/overlap";
import type { MapCameraAdapter } from "../map/MapCameraAdapter";
import { buildAudibleInspection, drawAudibleInspection, type AudibleInspectionGeometry } from "../overlays/audibleInspection";
import { audibleColor } from "./audiblePalette";

/** Continuous geographic hearing field, sampled through the current map camera. */
export class AudibleCanvasRenderer {
  private readonly mask = document.createElement("canvas");
  private projectionRevision = 0;
  private maskKey = "";

  constructor(private readonly canvas: HTMLCanvasElement, private readonly camera: MapCameraAdapter, private readonly inspectionCanvas: HTMLCanvasElement) {}

  /** Invalidate projected pixels after camera pan, zoom, pitch, bearing, or resize. */
  invalidateProjection(): void { this.projectionRevision++; }

  /** Discard the current field when Reset, strike set, or effect view changes. */
  dispose(): void { this.maskKey = ""; this.projectionRevision++; }

  /** Draw retained hearing fields and a single-strike geographic ruler in CSS pixels. */
  render(frames: readonly LaunchFrame[], width: number, height: number, multi: boolean, active: AudibleBandId | null): AudibleInspectionGeometry | null {
    const ratio = window.devicePixelRatio || 1;
    for (const canvas of [this.canvas, this.inspectionCanvas]) {
      const pixelsWide = Math.max(1, Math.round(width * ratio));
      const pixelsHigh = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
      if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
    }
    const context = this.canvas.getContext("2d");
    const inspection = this.inspectionCanvas.getContext("2d");
    if (!context || !inspection) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
    inspection.setTransform(ratio, 0, 0, ratio, 0, 0); inspection.clearRect(0, 0, width, height);
    if (width <= 0 || height <= 0 || frames.length === 0) { this.dispose(); return null; }
    const key = `${this.projectionRevision}:${width}:${height}:${frames.map(({ launch }) => `${launch.id}:${launch.yieldMt}`).join(",")}`;
    if (key !== this.maskKey) { this.sampleField(frames, width, height); this.maskKey = key; }
    context.imageSmoothingEnabled = true;
    context.drawImage(this.mask, 0, 0, width, height);
    if (multi || frames.length > 1) return null;
    const first = frames[0]!.launch;
    const geometry = buildAudibleInspection(this.camera, first.route.target, audibleRadiusForLaunch(first), width, height);
    if (geometry) drawAudibleInspection(inspection, geometry, active);
    return geometry;
  }

  /** Sample bounded geographic distance at a fixed raster budget; camera handles antimeridian and pitch. */
  private sampleField(frames: readonly LaunchFrame[], width: number, height: number): void {
    const scale = Math.min(0.48, 480 / width, 320 / height);
    const columns = Math.max(1, Math.ceil(width * scale));
    const rows = Math.max(1, Math.ceil(height * scale));
    this.mask.width = columns; this.mask.height = rows;
    const context = this.mask.getContext("2d");
    if (!context) return;
    const image = context.createImageData(columns, rows);
    const fields = frames.map(({ launch }) => ({ origin: launch.route.target, radiusKm: audibleRadiusForLaunch(launch) }));
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      let point;
      try { point = this.camera.toGeo({ x: (column + 0.5) / scale, y: (row + 0.5) / scale }); }
      catch { continue; }
      let peak = 0; let sum = 0;
      for (const field of fields) {
        const intensity = audibleIntensity(surfaceDistanceKm(point, field.origin) / field.radiusKm);
        peak = Math.max(peak, intensity); sum += intensity;
      }
      if (peak <= 0) continue;
      const [red, green, blue, alpha] = audibleColor(combineBlastPeakAndSum(peak, sum));
      const offset = (row * columns + column) * 4;
      image.data[offset] = red; image.data[offset + 1] = green; image.data[offset + 2] = blue; image.data[offset + 3] = alpha;
    }
    context.putImageData(image, 0, 0);
  }
}
