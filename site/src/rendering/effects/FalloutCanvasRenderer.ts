import type { LaunchFrame } from "../../application/launch";
import type { FalloutBandId, FalloutFootprint } from "../../domain/fallout";
import { destinationPoint } from "../../domain/geodesy";
import type { MapCameraAdapter } from "../map/MapCameraAdapter";
import { MULTI_BLAST_COLOR_LUT } from "./multiBlastPalette";
import { buildFalloutInspection, drawFalloutInspection, type FalloutInspectionGeometry } from "../overlays/falloutInspection";
import { buildFalloutTexture, FALLOUT_CACHE_TEXELS, type FalloutTexture } from "./falloutTexture";
import { projectFalloutTexture } from "./projectFalloutTexture";
import { buildFalloutContours, drawFalloutContours, type FalloutContour } from "./falloutContours";

/** Last semantic draw request, retained only while bounded quality refinement remains. */
interface FalloutDrawRequest {
  readonly frames: readonly LaunchFrame[];
  readonly width: number;
  readonly height: number;
  readonly multi: boolean;
  readonly active: FalloutBandId | null;
}

interface CachedField {
  texture: FalloutTexture;
  contours: readonly FalloutContour[] | null;
  refined: boolean;
}

/** Maximum scalar model samples in one refinement; previews share half this scene-wide budget. */
export const FALLOUT_WORK_CHUNK = 24_000;

/**
 * Render fallout from camera-independent, strike-local scalar textures. Every
 * retained field gets a complete coarse texture before any field is refined.
 * Camera changes reproject the textures and contours without sampling physics.
 * Additive scalar composition precedes palette lookup, preserving overlap hue.
 */
export class FalloutCanvasRenderer {
  private revision = 0;
  private textureRevision = 0;
  private fields = new Map<FalloutFootprint, CachedField>();
  private sceneSize = 0;
  private maskKey = "";
  private readonly scalarCanvas = document.createElement("canvas");
  private readonly fieldCanvas = document.createElement("canvas");
  private continuation: number | null = null;
  private latest: FalloutDrawRequest | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: MapCameraAdapter,
    private readonly inspectionCanvas: HTMLCanvasElement,
  ) {}

  /** Invalidate only the projected mask; geographic samples remain valid during camera gestures. */
  invalidateProjection(): void { this.revision++; }

  /** Release all geographic fields and pending refinements on Reset, view change, or disposal. */
  dispose(): void {
    this.cancel(); this.fields.clear(); this.sceneSize = 0; this.latest = null;
    this.maskKey = ""; this.textureRevision++;
  }

  /** Draw every retained nuclear field immediately and return the geographic single-view ruler. */
  render(frames: readonly LaunchFrame[], width: number, height: number, multi: boolean, active: FalloutBandId | null): FalloutInspectionGeometry | null {
    this.cancel(); this.latest = { frames, width, height, multi, active };
    const ratio = window.devicePixelRatio || 1;
    for (const canvas of [this.canvas, this.inspectionCanvas]) {
      const pixelsWide = Math.max(1, Math.round(width * ratio));
      const pixelsHigh = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
      if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
    }
    const context = this.canvas.getContext("2d"); const inspection = this.inspectionCanvas.getContext("2d");
    if (!context || !inspection) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
    inspection.setTransform(ratio, 0, 0, ratio, 0, 0); inspection.clearRect(0, 0, width, height);
    const fields = frames.flatMap(({ launch }) => launch.fallout ? [launch.fallout] : []);
    if (width <= 0 || height <= 0 || !fields.length) { this.dispose(); return null; }
    this.prepareScene(fields);
    const key = `${this.revision}:${this.textureRevision}:${width}:${height}`;
    if (this.maskKey !== key) { this.compose(fields, width, height); this.maskKey = key; }
    context.save(); context.globalCompositeOperation = "screen"; context.globalAlpha = 0.94;
    context.imageSmoothingEnabled = true; context.drawImage(this.fieldCanvas, 0, 0, width, height); context.restore();
    if (!multi) {
      const first = this.fields.get(fields[0]!)!;
      first.contours ??= buildFalloutContours(first.texture);
      drawFalloutContours(inspection, first.contours, this.camera);
    }
    for (const field of fields) drawLocalCoreGlow(context, this.camera, field, width, height);
    const geometry = !multi ? buildFalloutInspection(this.camera, fields[0]!, width, height) : null;
    if (geometry) drawFalloutInspection(inspection, geometry, active);
    if ([...this.fields.values()].some((field) => !field.refined)) this.continuation = requestAnimationFrame(() => {
      this.continuation = null;
      this.refineOneField();
      const request = this.latest;
      if (request) this.render(request.frames, request.width, request.height, request.multi, request.active);
    });
    return geometry;
  }

  /** Share bounded texture memory across the retained scene; no camera enters its cache key. */
  private prepareScene(fields: readonly FalloutFootprint[]): void {
    const retained = new Set(fields);
    let changed = false;
    for (const field of this.fields.keys()) if (!retained.has(field)) { this.fields.delete(field); changed = true; }
    // Resizing the per-field allowance prevents dense scenes growing an unbounded
    // collection of high-resolution textures. Existing entries remain reusable
    // while count is stable, including offscreen movement and marker focus.
    if (this.sceneSize !== fields.length) { this.fields.clear(); this.sceneSize = fields.length; changed = true; }
    const previewBudget = Math.max(4, Math.min(1_600, Math.floor(FALLOUT_WORK_CHUNK / (2 * fields.length))));
    for (const field of fields) if (!this.fields.has(field)) {
      this.fields.set(field, { texture: buildFalloutTexture(field, previewBudget), contours: null, refined: false }); changed = true;
    }
    if (changed) this.textureRevision++;
  }

  /** Refine one already-visible field per frame; no effect waits for another's first appearance. */
  private refineOneField(): void {
    const next = [...this.fields.entries()].find(([, cached]) => !cached.refined);
    if (!next) return;
    const [field, cached] = next;
    const budget = Math.max(4, Math.min(FALLOUT_WORK_CHUNK, Math.floor(FALLOUT_CACHE_TEXELS / this.fields.size)));
    cached.texture = buildFalloutTexture(field, budget); cached.contours = null; cached.refined = true;
    this.textureRevision++;
  }

  /** Sum cached scalar textures into one fixed-size screen mask, then apply the shared palette. */
  private compose(fields: readonly FalloutFootprint[], width: number, height: number): void {
    const scale = Math.min(0.42, 560 / width, 380 / height);
    const columns = Math.max(1, Math.ceil(width * scale)); const rows = Math.max(1, Math.ceil(height * scale));
    this.scalarCanvas.width = this.fieldCanvas.width = columns;
    this.scalarCanvas.height = this.fieldCanvas.height = rows;
    const scalar = this.scalarCanvas.getContext("2d", { willReadFrequently: true });
    const color = this.fieldCanvas.getContext("2d");
    if (!scalar || !color) return;
    scalar.setTransform(scale, 0, 0, scale, 0, 0);
    scalar.globalCompositeOperation = "lighter";
    for (const field of fields) projectFalloutTexture(scalar, this.fields.get(field)!.texture, this.camera, width, height);
    const samples = scalar.getImageData(0, 0, columns, rows);
    const image = color.createImageData(columns, rows);
    for (let i = 0; i < columns * rows; i++) {
      const value = samples.data[i * 4]!;
      if (value < 3) continue;
      for (let channel = 0; channel < 4; channel++) image.data[i * 4 + channel] = MULTI_BLAST_COLOR_LUT[value * 4 + channel]!;
    }
    color.putImageData(image, 0, 0);
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
