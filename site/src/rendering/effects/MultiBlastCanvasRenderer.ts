import type { LaunchFrame } from "../../application/launch";
import { combineBlastPeakAndSum, blastDamageIntensity } from "../../domain/overlap";
import { destinationPoint } from "../../domain/geodesy";
import type { BlastRadii } from "../../domain/blast";
import type { MapCameraAdapter, ScreenPoint } from "../map/MapCameraAdapter";
import { blastExpansion } from "../animation/blastTiming";
import { buildBlastDistanceGrid, type BlastDistanceGrid } from "./blastFieldGeometry";
import { MULTI_BLAST_COLOR_LUT, multiBlastDisplayIntensity } from "./multiBlastPalette";

const FALLOFF_FACTOR = 1.24;
const FLASH_MS = 1100;

/** One projected field and its current geographically measured expansion. */
interface FieldContribution {
  readonly grid: BlastDistanceGrid;
  readonly radii: BlastRadii;
  readonly travelledKm: number;
}

/** Sampling budget changes only when the strike-count tier changes. */
export function multiFieldBudget(strikeCount: number): { readonly width: number; readonly height: number; readonly frameMs: number } {
  if (strikeCount >= 16) return { width: 320, height: 220, frameMs: 50 };
  if (strikeCount >= 6) return { width: 420, height: 280, frameMs: 33 };
  return { width: 560, height: 380, frameMs: 16 };
}

/** Normalized contribution inside an expanding field and its soft outer tail. */
export function expandingBlastIntensity(distanceKm: number, radii: BlastRadii, travelledKm: number): number {
  if (travelledKm <= 0 || !Number.isFinite(distanceKm) || distanceKm > travelledKm * FALLOFF_FACTOR) return 0;
  if (distanceKm <= travelledKm) return blastDamageIntensity(distanceKm, radii);
  const fraction = (distanceKm - travelledKm) / (travelledKm * (FALLOFF_FACTOR - 1));
  const fade = 1 - fraction * fraction * (3 - 2 * fraction);
  return blastDamageIntensity(travelledKm, radii) * fade;
}

/**
 * Draws all live and settled blast fields through one bounded geographic mask.
 * Camera changes invalidate per-strike distance grids; an unchanged set of
 * settled fields reuses its composited bitmap while missiles continue moving.
 */
export class MultiBlastCanvasRenderer {
  private readonly grids = new Map<number, BlastDistanceGrid>();
  private fieldCanvas: HTMLCanvasElement | null = null;
  private fieldContext: CanvasRenderingContext2D | null = null;
  private compositionKey = "";
  private cameraRevision = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly camera: MapCameraAdapter, private readonly inspectionCanvas?: HTMLCanvasElement) {}

  /** Clear cached distances and colors after pan, zoom, pitch, bearing, or resize. */
  invalidateProjection(): void {
    this.cameraRevision += 1;
    this.grids.clear();
    this.compositionKey = "";
  }

  /** Paint all delivery frames at CSS-pixel viewport dimensions. */
  render(frames: readonly LaunchFrame[], width: number, height: number): void {
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
    const context = this.canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    this.clearInspection(pixelWidth, pixelHeight);
    if (width <= 0 || height <= 0) return;

    const impacted = frames.filter((frame) => frame.elapsedMs >= frame.launch.flightMs);
    if (impacted.length === 0) return;
    const budget = multiFieldBudget(frames.length);
    const signature = `${this.cameraRevision}:${width}:${height}:${budget.width}:${impacted.map(({ launch, elapsedMs }) => `${launch.id}/${Math.min(launch.blastMs, Math.floor((elapsedMs - launch.flightMs) / budget.frameMs) * budget.frameMs)}`).join(",")}`;
    if (signature !== this.compositionKey) this.composeField(impacted, width, height, budget);
    if (this.fieldCanvas) {
      context.save();
      context.imageSmoothingEnabled = true;
      context.drawImage(this.fieldCanvas, 0, 0, width, height);
      context.restore();
    }
    this.paintOpticalSuns(context, impacted);
    this.paintActiveShockwaves(context, impacted.slice(-8));
  }

  /** Remove stale single-strike ruler art from the shared inspection canvas. */
  private clearInspection(width: number, height: number): void {
    const canvas = this.inspectionCanvas;
    if (!canvas) return;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    canvas.getContext("2d")?.clearRect(0, 0, width, height);
  }

  /** Build geodesic grids once per camera and blend independent intensities. */
  private composeField(frames: readonly LaunchFrame[], width: number, height: number, budget: ReturnType<typeof multiFieldBudget>): void {
    const activeIds = new Set(frames.map((frame) => frame.launch.id));
    for (const id of this.grids.keys()) if (!activeIds.has(id)) this.grids.delete(id);
    const fields: FieldContribution[] = frames.map(({ launch, elapsedMs }) => {
      let grid = this.grids.get(launch.id);
      const scale = Math.min(0.42, budget.width / width, budget.height / height);
      const sampledWidth = Math.max(1, Math.ceil(width * scale));
      const sampledHeight = Math.max(1, Math.ceil(height * scale));
      if (!grid || grid.width !== sampledWidth || grid.height !== sampledHeight) {
        grid = buildBlastDistanceGrid(this.camera, launch.route.target, width, height, budget);
        this.grids.set(launch.id, grid);
      }
      const progress = Math.min(1, Math.max(0, (elapsedMs - launch.flightMs) / launch.blastMs));
      return { grid, radii: launch.radii, travelledKm: launch.radii.light * blastExpansion(progress) };
    });
    const first = fields[0]?.grid;
    if (!first) return;
    if (!this.fieldCanvas || this.fieldCanvas.width !== first.width || this.fieldCanvas.height !== first.height) {
      this.fieldCanvas = document.createElement("canvas");
      this.fieldCanvas.width = first.width;
      this.fieldCanvas.height = first.height;
      this.fieldContext = this.fieldCanvas.getContext("2d");
    }
    if (!this.fieldContext) return;
    const image = this.fieldContext.createImageData(first.width, first.height);
    for (let index = 0; index < first.distancesKm.length; index += 1) {
      let peak = 0;
      let sum = 0;
      for (const field of fields) {
        const intensity = expandingBlastIntensity(field.grid.distancesKm[index]!, field.radii, field.travelledKm);
        peak = Math.max(peak, intensity);
        sum += intensity;
      }
      if (peak <= 0) continue;
      const modeled = combineBlastPeakAndSum(peak, sum);
      const colorOffset = Math.min(255, Math.round(multiBlastDisplayIntensity(modeled) * 255)) * 4;
      const offset = index * 4;
      image.data[offset] = MULTI_BLAST_COLOR_LUT[colorOffset]!;
      image.data[offset + 1] = MULTI_BLAST_COLOR_LUT[colorOffset + 1]!;
      image.data[offset + 2] = MULTI_BLAST_COLOR_LUT[colorOffset + 2]!;
      image.data[offset + 3] = MULTI_BLAST_COLOR_LUT[colorOffset + 3]!;
    }
    this.fieldContext.putImageData(image, 0, 0);
    this.compositionKey = `${this.cameraRevision}:${width}:${height}:${budget.width}:${frames.map(({ launch, elapsedMs }) => `${launch.id}/${Math.min(launch.blastMs, Math.floor((elapsedMs - launch.flightMs) / budget.frameMs) * budget.frameMs)}`).join(",")}`;
  }

  /** Put a small white-hot glow over each impact while the WebGL domes remain distinct. */
  private paintOpticalSuns(context: CanvasRenderingContext2D, frames: readonly LaunchFrame[]): void {
    context.save();
    context.globalCompositeOperation = "screen";
    for (const { launch, elapsedMs } of frames) {
      const center = this.camera.toScreen(launch.route.target);
      if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) continue;
      const age = elapsedMs - launch.flightMs;
      const reveal = Math.min(1, age / 650);
      const radius = 22 + Math.min(38, launch.radii.fireball * 65);
      const glow = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
      glow.addColorStop(0, `rgba(255,255,245,${0.8 * reveal})`);
      glow.addColorStop(0.32, `rgba(255,235,129,${0.52 * reveal})`);
      glow.addColorStop(1, "rgba(255,102,28,0)");
      context.fillStyle = glow;
      context.beginPath(); context.arc(center.x, center.y, radius, 0, Math.PI * 2); context.fill();
      if (age < FLASH_MS) this.paintFlash(context, center, age);
    }
    context.restore();
  }

  /** Short impact flash remains visible above the combined mask. */
  private paintFlash(context: CanvasRenderingContext2D, center: ScreenPoint, ageMs: number): void {
    const life = Math.max(0, ageMs / FLASH_MS);
    const opacity = Math.min(1, life / 0.035) * (1 - life) ** 1.55;
    if (opacity <= 0) return;
    const radius = 34 + Math.sqrt(life) * 110;
    const flash = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
    flash.addColorStop(0, `rgba(255,255,255,${opacity})`);
    flash.addColorStop(0.35, `rgba(255,221,114,${0.7 * opacity})`);
    flash.addColorStop(1, "rgba(255,67,15,0)");
    context.fillStyle = flash;
    context.beginPath(); context.arc(center.x, center.y, radius, 0, Math.PI * 2); context.fill();
  }

  /** Keep only the newest eight active rings to bound dense-frame line work. */
  private paintActiveShockwaves(context: CanvasRenderingContext2D, frames: readonly LaunchFrame[]): void {
    for (const { launch, elapsedMs } of frames) {
      const progress = (elapsedMs - launch.flightMs) / launch.blastMs;
      if (progress <= 0 || progress >= 1) continue;
      const radiusKm = launch.radii.light * blastExpansion(progress);
      context.save();
      context.beginPath();
      let valid = true;
      for (let index = 0; index < 72; index += 1) {
        let point: ScreenPoint;
        try { point = this.camera.toScreen(destinationPoint(launch.route.target, radiusKm, index * 5)); }
        catch { valid = false; break; }
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) { valid = false; break; }
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      }
      if (valid) {
        context.closePath();
        context.strokeStyle = "rgba(255,93,48,.6)";
        context.lineWidth = 2;
        context.stroke();
      }
      context.restore();
    }
  }
}
