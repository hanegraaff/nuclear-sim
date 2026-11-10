import type { LaunchFrame } from "../../application/launch";
import { blastDamageIntensity } from "../../domain/overlap";
import { surfaceDistanceKm, type GeoPoint } from "../../domain/geodesy";
import type { BlastRadii } from "../../domain/blast";
import type { MapCameraAdapter } from "../map/MapCameraAdapter";
import { blastExpansion } from "../animation/blastTiming";
import { buildBlastGroundGrid, type BlastGroundGrid } from "./blastFieldGeometry";
import { writeComposedBlastSample } from "./multiBlastPalette";
import { createBlastFieldSampler } from "./blastPalette";
import { BlastOpticalEffects } from "./BlastOpticalEffects";

const FALLOFF_FACTOR = 1.24;
/** Maximum geodesic evaluations or launch candidates processed in one repaint. */
export const MULTI_FIELD_WORK_CHUNK = 600_000;
const MAX_LAUNCHES_PER_CHUNK = 1024;

/** One current geographic contribution, derived lazily for the active job. */
interface FieldContribution {
  readonly origin: GeoPoint;
  readonly radii: BlastRadii;
  readonly travelledKm: number;
  readonly sample: ReturnType<typeof createBlastFieldSampler>;
}

/** Mutable sample accumulators and cursor for one immutable set of strike frames. */
export interface MultiFieldWorkState {
  readonly frames: readonly LaunchFrame[];
  readonly ground: BlastGroundGrid;
  readonly peak: Float32Array;
  readonly sum: Float32Array;
  /** Dominant single-reference RGBA bytes; fixed memory independent of strike count. */
  readonly baseColors: Uint8ClampedArray;
  nextFrame: number;
  nextPixel: number;
  currentField: FieldContribution | null;
}

/** Incremental composition retained across animation frames of one camera. */
interface CompositionJob extends MultiFieldWorkState {
  readonly sceneKey: string;
  readonly frameKey: string;
}

/**
 * Keep a readable shared geographic mask even when thousands of strikes
 * accumulate. Width and height are mask pixels; frameMs is the minimum repaint
 * interval. Work is bounded by incremental chunks, not by erasing small fields.
 */
export function multiFieldBudget(strikeCount: number): { readonly width: number; readonly height: number; readonly frameMs: number } {
  return strikeCount >= 16 ? { width: 320, height: 220, frameMs: 50 }
    : strikeCount >= 6 ? { width: 420, height: 280, frameMs: 33 }
    : { width: 560, height: 380, frameMs: 16 };
}

/** Normalized contribution inside an expanding field and its soft outer tail. */
export function expandingBlastIntensity(distanceKm: number, radii: BlastRadii, travelledKm: number): number {
  if (travelledKm <= 0 || !Number.isFinite(distanceKm) || distanceKm > travelledKm * FALLOFF_FACTOR) return 0;
  if (distanceKm <= travelledKm) return blastDamageIntensity(distanceKm, radii);
  const fraction = (distanceKm - travelledKm) / (travelledKm * (FALLOFF_FACTOR - 1));
  const fade = 1 - fraction * fraction * (3 - 2 * fraction);
  return blastDamageIntensity(travelledKm, radii) * fade;
}

/** Allocate bounded per-sample accumulators; no per-strike distance grids persist. */
export function createMultiFieldWork(frames: readonly LaunchFrame[], ground: BlastGroundGrid): MultiFieldWorkState {
  return {
    frames, ground, peak: new Float32Array(ground.longitudes.length), sum: new Float32Array(ground.longitudes.length),
    baseColors: new Uint8ClampedArray(ground.longitudes.length * 4),
    nextFrame: 0, nextPixel: 0, currentField: null,
  };
}

/**
 * Add at most maxEvaluations geographic cells and maxLaunches candidates.
 * Returns the consumed work and completion state; repeated calls include every
 * visible strike in order-independent peak and sum accumulators.
 */
export function advanceMultiFieldWork(state: MultiFieldWorkState, maxEvaluations: number, maxLaunches: number): { readonly evaluations: number; readonly visitedLaunches: number; readonly complete: boolean } {
  let evaluations = 0;
  let visitedLaunches = 0;
  const cells = state.ground.longitudes.length;
  while (state.nextFrame < state.frames.length && evaluations < maxEvaluations && visitedLaunches < maxLaunches) {
    if (!state.currentField) {
      visitedLaunches += 1;
      const { launch, elapsedMs } = state.frames[state.nextFrame]!;
      const progress = Math.min(1, Math.max(0, (elapsedMs - launch.flightMs) / launch.blastMs));
      const travelledKm = launch.radii.light * blastExpansion(progress);
      const origin = launch.route.target;
      const center = state.ground.center;
      if (travelledKm <= 0 || (center && surfaceDistanceKm(origin, center) > state.ground.farthestFromCenterKm + travelledKm * FALLOFF_FACTOR)) {
        state.nextFrame += 1;
        continue;
      }
      state.currentField = { origin, radii: launch.radii, travelledKm, sample: createBlastFieldSampler(launch.radii) };
    }
    const field = state.currentField;
    while (state.nextPixel < cells && evaluations < maxEvaluations) {
      const index = state.nextPixel++;
      evaluations += 1;
      const longitude = state.ground.longitudes[index]!;
      const latitude = state.ground.latitudes[index]!;
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;
      const distance = Math.fround(surfaceDistanceKm(field.origin, { longitude, latitude }));
      const intensity = Math.fround(expandingBlastIntensity(distance, field.radii, field.travelledKm));
      if (intensity <= 0) continue;
      const peak = state.peak[index]!;
      const offset = index * 4;
      if (intensity >= peak) {
        const color = field.sample(distance, field.travelledKm);
        const alpha = Math.round(color.alpha * 255);
        // Equal-intensity fields can have different expanding-tail colors.
        // A deterministic lexicographic tie break preserves order independence.
        const rank = alpha * 0x1000000 + color.red * 0x10000 + color.green * 0x100 + color.blue;
        const priorRank = state.baseColors[offset + 3]! * 0x1000000 + state.baseColors[offset]! * 0x10000 + state.baseColors[offset + 1]! * 0x100 + state.baseColors[offset + 2]!;
        if (intensity > peak || rank > priorRank) {
          state.baseColors[offset] = color.red; state.baseColors[offset + 1] = color.green;
          state.baseColors[offset + 2] = color.blue; state.baseColors[offset + 3] = alpha;
        }
      }
      state.peak[index] = Math.max(peak, intensity);
      state.sum[index] = state.sum[index]! + intensity;
    }
    if (state.nextPixel === cells) {
      state.nextFrame += 1;
      state.nextPixel = 0;
      state.currentField = null;
    }
  }
  return { evaluations, visitedLaunches, complete: state.nextFrame === state.frames.length };
}

/**
 * Draws all live and settled blast fields through one bounded geographic mask.
 * Camera changes invalidate per-strike distance grids; an unchanged set of
 * settled fields reuses its composited bitmap while missiles continue moving.
 */
export class MultiBlastCanvasRenderer {
  private ground: BlastGroundGrid | null = null;
  private groundKey = "";
  private job: CompositionJob | null = null;
  private repaintId: number | null = null;
  private latestRequest: { readonly frames: readonly LaunchFrame[]; readonly width: number; readonly height: number; readonly clearInspection: boolean } | null = null;
  private fieldCanvas: HTMLCanvasElement | null = null;
  private fieldContext: CanvasRenderingContext2D | null = null;
  private compositionKey = "";
  private cameraRevision = 0;

  private readonly optics: BlastOpticalEffects;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly camera: MapCameraAdapter, private readonly inspectionCanvas?: HTMLCanvasElement) { this.optics = new BlastOpticalEffects(camera); }

  /** Drop the one shared camera grid and cancel stale chunks after projection changes. */
  invalidateProjection(): void {
    this.cameraRevision += 1;
    this.optics.invalidateProjection();
    this.cancelPending();
    this.ground = null;
    this.groundKey = "";
    this.job = null;
    this.fieldCanvas = null;
    this.fieldContext = null;
    this.compositionKey = "";
  }

  /** Cancel scheduled continuation when the map controller is disposed. */
  dispose(): void {
    this.optics.invalidateProjection();
    this.cancelPending();
    this.latestRequest = null;
    this.job = null;
    this.ground = null;
    this.groundKey = "";
    this.fieldCanvas = null;
    this.fieldContext = null;
    this.compositionKey = "";
  }

  /** Paint all delivery frames at CSS-pixel viewport dimensions; preserve a grouped single-launch ruler when requested. */
  render(frames: readonly LaunchFrame[], width: number, height: number, clearInspection = true): void {
    // An external map/store frame supersedes our queued continuation, so one
    // repaint never schedules a duplicate chunk of the same composition.
    this.cancelPending();
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
    const context = this.canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (clearInspection) this.clearInspection(pixelWidth, pixelHeight);
    if (width <= 0 || height <= 0) return;

    const impacted = frames.filter((frame) => frame.elapsedMs >= frame.launch.flightMs);
    if (impacted.length === 0) {
      this.cancelPending();
      this.job = null;
      this.ground = null;
      this.groundKey = "";
      this.fieldCanvas = null;
      this.fieldContext = null;
      this.compositionKey = "";
      return;
    }
    const budget = multiFieldBudget(frames.length);
    const sceneKey = `${this.cameraRevision}:${width}:${height}:${budget.width}:${budget.height}:${impacted.map(({ launch }) => launch.id).join(",")}`;
    const frameKey = `${sceneKey}:${impacted.map(({ launch, elapsedMs }) => Math.min(launch.blastMs, Math.floor((elapsedMs - launch.flightMs) / budget.frameMs) * budget.frameMs)).join(",")}`;
    this.latestRequest = { frames, width, height, clearInspection };
    if (this.job && this.job.sceneKey !== sceneKey) this.job = null;
    if (!this.job && frameKey !== this.compositionKey) this.startJob(sceneKey, frameKey, impacted, width, height, budget);
    if (this.job) this.processChunk();
    if (this.fieldCanvas) {
      context.save();
      context.imageSmoothingEnabled = true;
      context.drawImage(this.fieldCanvas, 0, 0, width, height);
      context.restore();
    }
    // Sun glows are decorative; all geographic fields and WebGL domes remain
    // present while only the eight newest glows use per-frame Canvas work.
    for (const { launch, elapsedMs } of impacted.slice(-8)) {
      this.optics.paint(context, launch, elapsedMs, width, height, {
        viewportWidth: width, viewportHeight: height,
        sample: () => {
          const ground = this.ground;
          if (!ground) return null;
          // One temporary distance array builds a cached light bitmap; no
          // per-strike geographic masks survive this callback.
          const distancesKm = Float32Array.from(ground.longitudes, (longitude, index) =>
            surfaceDistanceKm(launch.route.target, { longitude, latitude: ground.latitudes[index]! }));
          return { width: ground.width, height: ground.height, scale: ground.width / width, distancesKm };
        },
      });
    }
    if (this.job || frameKey !== this.compositionKey) this.scheduleContinuation();
  }

  /** Remove stale single-strike ruler art from the shared inspection canvas. */
  private clearInspection(width: number, height: number): void {
    const canvas = this.inspectionCanvas;
    if (!canvas) return;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    canvas.getContext("2d")?.clearRect(0, 0, width, height);
  }

  /** Prepare one shared viewport ground grid instead of one mask per strike. */
  private startJob(sceneKey: string, frameKey: string, frames: readonly LaunchFrame[], width: number, height: number, budget: ReturnType<typeof multiFieldBudget>): void {
    const groundKey = `${this.cameraRevision}:${width}:${height}:${budget.width}:${budget.height}`;
    const ground = this.ground && this.groundKey === groundKey
      ? this.ground : buildBlastGroundGrid(this.camera, width, height, budget);
    this.ground = ground;
    this.groundKey = groundKey;
    this.job = {
      sceneKey, frameKey, ...createMultiFieldWork(frames, ground),
    };
  }

  /** Process a fixed number of geographic evaluations and resume next frame. */
  private processChunk(): void {
    const job = this.job;
    if (!job) return;
    const result = advanceMultiFieldWork(job, MULTI_FIELD_WORK_CHUNK, MAX_LAUNCHES_PER_CHUNK);
    if (result.complete) {
      this.writeComposedField(job);
      this.compositionKey = job.frameKey;
      this.job = null;
    } else if (!this.fieldCanvas) {
      // A moving camera cannot reuse the previous projection; show the valid
      // partial field now, then converge to all visible strikes after settling.
      this.writeComposedField(job);
    }
  }

  /** Convert accumulated model intensities into a single thermal bitmap. */
  private writeComposedField(job: CompositionJob): void {
    const { ground } = job;
    if (!this.fieldCanvas || this.fieldCanvas.width !== ground.width || this.fieldCanvas.height !== ground.height) {
      this.fieldCanvas = document.createElement("canvas");
      this.fieldCanvas.width = ground.width;
      this.fieldCanvas.height = ground.height;
      this.fieldContext = this.fieldCanvas.getContext("2d");
    }
    if (!this.fieldContext) return;
    const image = this.fieldContext.createImageData(ground.width, ground.height);
    for (let index = 0; index < job.peak.length; index += 1) {
      const peak = job.peak[index]!;
      if (peak <= 0) continue;
      const sum = job.sum[index]!;
      writeComposedBlastSample(image.data, index * 4, peak, sum, job.baseColors);
    }
    this.fieldContext.putImageData(image, 0, 0);
  }

  /** Continue a pending composition without relying on an active launch clock. */
  private scheduleContinuation(): void {
    if (this.repaintId !== null) return;
    this.repaintId = requestAnimationFrame(() => {
      this.repaintId = null;
      const request = this.latestRequest;
      if (request) this.render(request.frames, request.width, request.height, request.clearInspection);
    });
  }

  /** Stop a queued continuation before reset, disposal, or camera replacement. */
  private cancelPending(): void {
    if (this.repaintId === null) return;
    cancelAnimationFrame(this.repaintId);
    this.repaintId = null;
  }

}
