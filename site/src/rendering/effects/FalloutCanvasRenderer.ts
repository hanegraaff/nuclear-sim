import type { LaunchFrame } from "../../application/launch";
import { FALLOUT_BANDS, falloutIntensityAt, type FalloutBandId, type FalloutFootprint } from "../../domain/fallout";
import { destinationPoint, surfaceDistanceKm } from "../../domain/geodesy";
import type { MapCameraAdapter } from "../map/MapCameraAdapter";
import { buildBlastGroundGrid, type BlastGroundGrid } from "./blastFieldGeometry";
import { MULTI_BLAST_COLOR_LUT } from "./multiBlastPalette";
import { buildFalloutInspection, drawFalloutInspection, FALLOUT_COLORS, type FalloutInspectionGeometry } from "../overlays/falloutInspection";

interface FalloutJob {
  readonly key: string;
  readonly ground: BlastGroundGrid;
  readonly fields: readonly FalloutFootprint[];
  readonly values: Float32Array;
  fieldIndex: number;
  pixelIndex: number;
}

/** Last semantic draw request, reused only while bounded sampling work remains. */
interface FalloutDrawRequest {
  readonly frames: readonly LaunchFrame[];
  readonly width: number;
  readonly height: number;
  readonly multi: boolean;
  readonly active: FalloutBandId | null;
}

/** Maximum model field evaluations per repaint, independent of retained strike count. */
export const FALLOUT_WORK_CHUNK = 12_000;

/**
 * Draw settled nuclear fallout through one bounded geographic field mask.
 * The model owns physical geometry; this adapter owns palette, projection,
 * contour extraction, cache lifetime, and chunked browser work.
 */
export class FalloutCanvasRenderer {
  private revision = 0;
  private job: FalloutJob | null = null;
  private cacheKey = "";
  private fieldCanvas: HTMLCanvasElement | null = null;
  private values: Float32Array | null = null;
  private continuation: number | null = null;
  private latest: FalloutDrawRequest | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: MapCameraAdapter,
    private readonly inspectionCanvas: HTMLCanvasElement,
  ) {}

  /** Invalidate geographic samples and cancel obsolete work after any camera change. */
  invalidateProjection(): void {
    this.cancel();
    this.revision++;
    this.job = null;
    this.cacheKey = "";
    this.fieldCanvas = null;
    this.values = null;
  }

  /** Release pending work on view change, Reset, or controller disposal. */
  dispose(): void {
    this.invalidateProjection();
    this.latest = null;
  }

  /** Draw all retained nuclear footprints and return the single-view geographic ruler. */
  render(
    frames: readonly LaunchFrame[], width: number, height: number,
    multi: boolean, active: FalloutBandId | null,
  ): FalloutInspectionGeometry | null {
    this.cancel();
    this.latest = { frames, width, height, multi, active };
    const ratio = window.devicePixelRatio || 1;
    for (const canvas of [this.canvas, this.inspectionCanvas]) {
      if (canvas.width !== Math.max(1, Math.round(width * ratio))) canvas.width = Math.max(1, Math.round(width * ratio));
      if (canvas.height !== Math.max(1, Math.round(height * ratio))) canvas.height = Math.max(1, Math.round(height * ratio));
    }
    const context = this.canvas.getContext("2d");
    const inspection = this.inspectionCanvas.getContext("2d");
    if (!context || !inspection) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    inspection.setTransform(ratio, 0, 0, ratio, 0, 0);
    inspection.clearRect(0, 0, width, height);
    const nuclear = frames.filter(({ launch }) => launch.fallout);
    if (width <= 0 || height <= 0 || nuclear.length === 0) {
      this.dispose();
      return null;
    }
    const key = `${this.revision}:${width}:${height}:${nuclear.map(({ launch }) => launch.id).join(",")}`;
    if (this.cacheKey !== key && this.job?.key !== key) {
      const budget = nuclear.length > 10 ? { width: 320, height: 220 } : { width: 560, height: 380 };
      const ground = buildBlastGroundGrid(this.camera, width, height, budget);
      const fields = nuclear.map(({ launch }) => launch.fallout!).filter((field) => !ground.center
        || surfaceDistanceKm(field.origin, ground.center) <= ground.farthestFromCenterKm + field.dimensions.lengthKm * 1.5 + field.dimensions.localRadiusKm * 2);
      this.job = {
        key, ground, fields, values: new Float32Array(ground.longitudes.length),
        fieldIndex: 0, pixelIndex: 0,
      };
    }
    if (this.job) this.advance();
    if (this.fieldCanvas) {
      context.save();
      context.globalCompositeOperation = "screen";
      context.globalAlpha = 0.94;
      context.imageSmoothingEnabled = true;
      context.drawImage(this.fieldCanvas, 0, 0, width, height);
      context.restore();
      if (!multi && this.values) {
        drawContours(inspection, this.values, this.fieldCanvas.width, this.fieldCanvas.height, width, height);
      }
    }
    for (const { launch } of nuclear) drawLocalCoreGlow(context, this.camera, launch.fallout!, width, height);
    const geometry = !multi ? buildFalloutInspection(this.camera, nuclear[0]!.launch.fallout!, width, height) : null;
    if (geometry) drawFalloutInspection(inspection, geometry, active);
    if (this.job) this.continuation = requestAnimationFrame(() => {
      this.continuation = null;
      const request = this.latest;
      if (request) this.render(request.frames, request.width, request.height, request.multi, request.active);
    });
    return geometry;
  }

  /** Add one bounded chunk; every retained visible field is eventually included. */
  private advance(): void {
    const job = this.job!;
    let evaluations = 0;
    while (job.fieldIndex < job.fields.length && evaluations < FALLOUT_WORK_CHUNK) {
      const field = job.fields[job.fieldIndex]!;
      while (job.pixelIndex < job.values.length && evaluations < FALLOUT_WORK_CHUNK) {
        const i = job.pixelIndex++;
        evaluations++;
        const longitude = job.ground.longitudes[i]!;
        const latitude = job.ground.latitudes[i]!;
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;
        job.values[i] = Math.min(1, job.values[i]! + falloutIntensityAt(field, { longitude, latitude }));
      }
      if (job.pixelIndex === job.values.length) {
        job.fieldIndex++;
        job.pixelIndex = 0;
      }
    }
    if (!this.fieldCanvas) this.fieldCanvas = document.createElement("canvas");
    this.fieldCanvas.width = job.ground.width;
    this.fieldCanvas.height = job.ground.height;
    const context = this.fieldCanvas.getContext("2d");
    if (context) {
      const image = context.createImageData(job.ground.width, job.ground.height);
      for (let i = 0; i < job.values.length; i++) {
        const value = job.values[i]!;
        if (value < 0.012) continue;
        const color = Math.min(255, Math.round(value * 255)) * 4;
        for (let channel = 0; channel < 4; channel++) {
          image.data[i * 4 + channel] = MULTI_BLAST_COLOR_LUT[color + channel]!;
        }
      }
      context.putImageData(image, 0, 0);
    }
    this.values = job.values;
    if (job.fieldIndex === job.fields.length) {
      this.cacheKey = job.key;
      this.job = null;
    }
  }

  private cancel(): void {
    if (this.continuation !== null) cancelAnimationFrame(this.continuation);
    this.continuation = null;
  }
}

/**
 * Add the prototype's round white/yellow local highlight as an optical accent.
 * Its anchor and radius derive from modeled geography in the current camera;
 * it does not move dose contours, change distances, or replace ground samples.
 * A 0.92 aspect preserves the reference's nearly round bright skirt under pitch.
 */
function drawLocalCoreGlow(context: CanvasRenderingContext2D, camera: MapCameraAdapter, field: FalloutFootprint, width: number, height: number): void {
  try {
    const center = camera.toScreen(field.origin);
    const extents = [0, 90, 180, 270].map((bearing) => {
      const point = camera.toScreen(destinationPoint(field.origin, field.dimensions.localRadiusKm * 0.54, bearing));
      return Math.hypot(point.x - center.x, point.y - center.y);
    });
    if (![center.x, center.y, ...extents].every(Number.isFinite)) return;
    const radius = Math.max(1, Math.min(Math.max(width, height) * 0.2, Math.max(...extents)));
    if (center.x + radius < 0 || center.y + radius < 0 || center.x - radius > width || center.y - radius > height) return;
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, "rgba(255,255,231,.96)");
    gradient.addColorStop(0.38, "rgba(255,255,209,.90)");
    gradient.addColorStop(0.60, "rgba(255,236,116,.60)");
    gradient.addColorStop(0.82, "rgba(255,149,49,.20)");
    gradient.addColorStop(1, "rgba(255,115,30,0)");
    context.save();
    context.globalCompositeOperation = "screen";
    context.translate(center.x, center.y);
    context.scale(1, 0.92);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  } catch {
    // A sky/horizon projection must not prevent the ground field or ruler.
  }
}

/** March scalar-grid contour crossings into thin prototype-colored screen paths. */
function drawContours(context: CanvasRenderingContext2D, values: Float32Array, columns: number, rows: number, width: number, height: number): void {
  const sx = width / columns; const sy = height / rows;
  context.save(); context.lineWidth = 1.3; context.globalAlpha = 0.8;
  for (const band of FALLOUT_BANDS) {
    if (band.id === "extreme") continue;
    context.strokeStyle = FALLOUT_COLORS[band.id]; context.beginPath();
    for (let y = 0; y < rows - 1; y++) for (let x = 0; x < columns - 1; x++) {
      const points = [[x + 0.5, y + 0.5], [x + 1.5, y + 0.5], [x + 1.5, y + 1.5], [x + 0.5, y + 1.5]];
      const samples = [values[y * columns + x]!, values[y * columns + x + 1]!, values[(y + 1) * columns + x + 1]!, values[(y + 1) * columns + x]!];
      const crossings: { x: number; y: number }[] = [];
      for (let edge = 0; edge < 4; edge++) {
        const next = (edge + 1) % 4;
        if ((samples[edge]! >= band.threshold) === (samples[next]! >= band.threshold)) continue;
        const fraction = (band.threshold - samples[edge]!) / (samples[next]! - samples[edge]!);
        crossings.push({ x: (points[edge]![0]! + (points[next]![0]! - points[edge]![0]!) * fraction) * sx,
          y: (points[edge]![1]! + (points[next]![1]! - points[edge]![1]!) * fraction) * sy });
      }
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        context.moveTo(crossings[i]!.x, crossings[i]!.y); context.lineTo(crossings[i + 1]!.x, crossings[i + 1]!.y);
      }
    }
    context.stroke();
  }
  context.restore();
}
