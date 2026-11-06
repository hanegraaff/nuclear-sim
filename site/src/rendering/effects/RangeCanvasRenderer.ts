import type { LaunchFrame } from "../../application/launch";
import { destinationPoint, EARTH_RADIUS_KM, normalizeLongitude, surfaceDistanceKm, type GeoPoint } from "../../domain/geodesy";
import { combineBlastPeakAndSum } from "../../domain/overlap";
import type { MapCameraAdapter } from "../map/MapCameraAdapter";
import { captureAudibleReprojection, drawAudibleReprojection, type AudibleReprojectionMesh } from "./audibleReprojection";

/** Maximum geographic cell contributions in one synchronous paint. */
export const RANGE_WORK_CHUNK = 24_000;
/** Maximum scene-wide geographic samples in a complete first-entry preview. */
export const RANGE_PREVIEW_SAMPLES = 8_000;
const MAX_FIELDS_PER_CHUNK = 256;
const TAIL_FACTOR = 1.12;

/** Inclusive bounds of mask samples that can receive one geographic range field. */
export interface RangeRasterBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface RangeField {
  readonly origin: GeoPoint;
  readonly radiusKm: number;
  readonly bounds: RangeRasterBounds;
}

/** Mode-specific geographic range model and palette at the rendering boundary. */
export interface RangeCanvasSpec<BandId extends string, Geometry> {
  readonly radiusForLaunch: (launch: LaunchFrame["launch"]) => number;
  readonly intensity: (normalizedDistance: number) => number;
  readonly color: (intensity: number) => readonly [number, number, number, number];
  readonly buildInspection: (camera: MapCameraAdapter, origin: GeoPoint, radiusKm: number, width: number, height: number) => Geometry | null;
  readonly drawInspection: (context: CanvasRenderingContext2D, geometry: Geometry, active: BandId | null) => void;
  readonly restoreMeshAlpha: (image: ImageData) => void;
}

interface CompositionJob {
  readonly key: string;
  readonly sceneKey: string;
  readonly frames: readonly LaunchFrame[];
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly sampleLeft: number;
  readonly sampleTop: number;
  readonly allowPartial: boolean;
  readonly columns: number;
  readonly canvas: HTMLCanvasElement;
  readonly mesh: AudibleReprojectionMesh;
  readonly context: CanvasRenderingContext2D;
  readonly image: ImageData;
  readonly points: (GeoPoint | null | undefined)[];
  readonly peak: Float32Array;
  readonly sum: Float32Array;
  hasVisiblePixels: boolean;
  nextFrame: number;
  nextCell: number;
  currentField: RangeField | null;
}

interface CompletedField {
  readonly key: string;
  readonly sceneKey: string;
  readonly canvas: HTMLCanvasElement;
  readonly mesh: AudibleReprojectionMesh;
}

interface SampleRectangle {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** A tail reaching the antipode covers every surface point, including repeated Mercator worlds. */
function fullWorldRectangle(camera: MapCameraAdapter, origin: GeoPoint, width: number, height: number): SampleRectangle | null {
  try {
    const center = camera.unwrappedCenterLongitude();
    const nearestOrigin = center + normalizeLongitude(origin.longitude - center);
    const worldEdges = [-540, 540].map((offset) => camera.toScreenUnwrapped({ longitude: nearestOrigin + offset, latitude: 0 }).x);
    const north = camera.toScreenUnwrapped({ longitude: nearestOrigin, latitude: 85 }).y;
    const south = camera.toScreenUnwrapped({ longitude: nearestOrigin, latitude: -85 }).y;
    if (![...worldEdges, north, south].every(Number.isFinite)) return null;
    // Keep the starting screen and adjacent copies: the eased camera may show
    // several worlds at minimum zoom before the settled full mask is ready.
    const left = Math.floor(Math.min(0, ...worldEdges) - width);
    const top = Math.floor(Math.min(0, north, south) - height);
    const right = Math.ceil(Math.max(width, ...worldEdges) + width);
    const bottom = Math.ceil(Math.max(height, north, south) + height);
    return { left, top, width: right - left, height: bottom - top };
  } catch { return null; }
}

/** Bound complete range circles in the starting camera, so reprojection never exposes the preview mask's rectangular edge. */
function firstEntryRectangle(camera: MapCameraAdapter, frames: readonly LaunchFrame[], width: number, height: number, radiusForLaunch: RangeCanvasSpec<string, unknown>["radiusForLaunch"]): SampleRectangle | null {
  if (frames.some(({ launch }) => radiusForLaunch(launch) * TAIL_FACTOR * 1.04 >= Math.PI * EARTH_RADIUS_KM)) {
    // A circular perimeter is undefined beyond the antipode. One such strike
    // has a nonzero field on the entire globe, so include all world copies.
    return fullWorldRectangle(camera, frames.at(-1)!.launch.route.target, width, height);
  }
  const xs: number[] = [];
  const ys: number[] = [];
  for (const { launch } of frames) {
    const radiusKm = radiusForLaunch(launch) * TAIL_FACTOR * 1.04;
    for (let bearing = 0; bearing < 360; bearing += 10) {
      try {
        const point = camera.toScreen(destinationPoint(launch.route.target, radiusKm, bearing));
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
        xs.push(point.x); ys.push(point.y);
      } catch { return null; }
    }
  }
  if (xs.length === 0) return null;
  const left = Math.floor(Math.min(...xs) - 8);
  const top = Math.floor(Math.min(...ys) - 8);
  const right = Math.ceil(Math.max(...xs) + 8);
  const bottom = Math.ceil(Math.max(...ys) + 8);
  // A remote field can project to an enormous rectangle before the ease. Let
  // the moving camera construct its own bounded preview in that case.
  if (right - left > width * 8 || bottom - top > height * 8
    || right < -width || left > width * 2 || bottom < -height || top > height * 2) return null;
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

/** Fill the visible core first, then symmetric rows toward the faint rim. */
function centerOutRow(order: number, count: number): number {
  const middle = Math.floor((count - 1) / 2);
  return order === 0 ? middle : order % 2 === 1 ? middle + (order + 1) / 2 : middle - order / 2;
}

/** Stable strike identity for camera-independent range cache decisions. */
function sceneKeyForFrames(frames: readonly LaunchFrame[]): string {
  return frames.map(({ launch }) =>
    [launch.id, launch.deviceId, launch.yieldMt, launch.route.target.longitude, launch.route.target.latitude].join(":")).join(",");
}

/**
 * Conservative projected cap bound for a north-up, unpitched Mercator camera.
 * Pitched, rotated, polar, low-zoom world-copy, and wrap-ambiguous fields use
 * the whole mask. Width and height are CSS pixels; scale is samples per pixel;
 * origin is degrees and radiusKm is surface kilometers.
 * Returns null only when the field is provably outside the viewport.
 */
export function rangeFieldBounds(camera: MapCameraAdapter, origin: GeoPoint, radiusKm: number, width: number, height: number, scale: number): RangeRasterBounds | null {
  const columns = Math.max(1, Math.ceil(width * scale));
  const rows = Math.max(1, Math.ceil(height * scale));
  const full = { left: 0, top: 0, right: columns - 1, bottom: rows - 1 };
  let center: GeoPoint;
  let pitch: number;
  let bearing: number;
  let zoom: number;
  try { ({ center, pitch, bearing, zoom } = camera.snapshot()); }
  catch { return full; }
  if (Math.abs(pitch) > 0.01 || Math.abs(normalizeLongitude(bearing)) > 0.01) return full;
  // The map may render repeated worlds at low zoom. A single projected cap
  // cannot bound both copies, so keep every mask sample in that case.
  if (512 * 2 ** zoom <= width * 4) return full;
  const angular = radiusKm * TAIL_FACTOR / EARTH_RADIUS_KM;
  const latitudeSpan = angular * 180 / Math.PI;
  if (!Number.isFinite(angular) || angular >= Math.PI / 2 || Math.abs(origin.latitude) + latitudeSpan >= 85) return full;
  const longitudeSpan = Math.asin(Math.min(1, Math.sin(angular) / Math.cos(origin.latitude * Math.PI / 180))) * 180 / Math.PI;
  const fromCenter = normalizeLongitude(origin.longitude - center.longitude);
  if (Math.abs(fromCenter) + longitudeSpan >= 179.5) return full;
  const west = origin.longitude - longitudeSpan;
  const east = origin.longitude + longitudeSpan;
  const south = origin.latitude - latitudeSpan;
  const north = origin.latitude + latitudeSpan;
  try {
    const corners = [
      camera.toScreen({ longitude: west, latitude: south }),
      camera.toScreen({ longitude: west, latitude: north }),
      camera.toScreen({ longitude: east, latitude: south }),
      camera.toScreen({ longitude: east, latitude: north }),
    ];
    const xs = corners.map((point) => point.x);
    const ys = corners.map((point) => point.y);
    if (![...xs, ...ys].every(Number.isFinite)) return full;
    // Two CSS pixels absorb sample-center rounding and projection precision.
    const left = Math.floor((Math.min(...xs) - 2) * scale);
    const top = Math.floor((Math.min(...ys) - 2) * scale);
    const right = Math.ceil((Math.max(...xs) + 2) * scale);
    const bottom = Math.ceil((Math.max(...ys) + 2) * scale);
    if (right < 0 || bottom < 0 || left >= columns || top >= rows) return null;
    return { left: Math.max(0, left), top: Math.max(0, top), right: Math.min(columns - 1, right), bottom: Math.min(rows - 1, bottom) };
  } catch { return full; }
}

/** Continuous geographic range field, sampled through a bounded map-camera mask. */
export class RangeCanvasRenderer<BandId extends string, Geometry> {
  private projectionRevision = 0;
  private job: CompositionJob | null = null;
  private completed: CompletedField | null = null;
  private preview: CompletedField | null = null;
  private previewRevision = -1;
  private adaptivePreview = false;
  private emptyKey = "";
  private continuationId: number | null = null;
  private cameraMoving = false;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly camera: MapCameraAdapter, private readonly inspectionCanvas: HTMLCanvasElement, private readonly spec: RangeCanvasSpec<BandId, Geometry>) {}

  /** Keep the completed geographic field visible while cancelling obsolete camera samples. */
  invalidateProjection(): void {
    this.projectionRevision++;
    this.cameraMoving = true;
    // A partially filled mask has straight row/column boundaries. Only a
    // complete preview or completed field can survive a camera transition.
    this.cancelContinuation();
    this.job = null;
  }

  /** Resume one bounded rebuild when the map camera settles. */
  settleProjection(): void { this.cameraMoving = false; }

  /**
   * Paint a complete low-resolution geographic field before the first
   * single-group camera ease. Up to ten deliveries fit in 8,000 samples;
   * subsequent camera frames reproject this cache until full refinement.
   */
  primeFirstEntry(frames: readonly LaunchFrame[], width: number, height: number): void {
    if (frames.length === 0 || frames.length > 10 || width <= 0 || height <= 0 || this.completed || this.preview || this.job) return;
    const wholeField = firstEntryRectangle(this.camera, frames, width, height, this.spec.radiusForLaunch);
    const globalField = frames.some(({ launch }) => this.spec.radiusForLaunch(launch) * TAIL_FACTOR * 1.04 >= Math.PI * EARTH_RADIUS_KM);
    // A huge source rectangle spends nearly every preview texel outside the
    // current map. During a large first-entry zoom its mesh can also cross
    // Mercator's polar limit. Sample an overscanned viewport instead and
    // refresh that small complete cache as the camera moves.
    this.adaptivePreview = !globalField && (!wholeField || wholeField.width > width * 2 || wholeField.height > height * 2);
    const rectangle = this.adaptivePreview || !wholeField
      ? { left: -width * 0.4, top: -height * 0.4, width: width * 1.8, height: height * 1.8 }
      : wholeField;
    const sceneKey = sceneKeyForFrames(frames);
    const divisor = Math.sqrt(frames.length);
    const columns = Math.max(1, Math.floor(100 / divisor));
    const rows = Math.max(1, Math.floor(80 / divisor));
    const scale = Math.min(0.48, columns / rectangle.width, rows / rectangle.height);
    this.job = this.createJob("preview:" + sceneKey, sceneKey, frames, width, height, scale, rectangle);
    if (!this.job) return;
    const previewJob = this.job;
    this.advance(previewJob);
    const coarse = this.completed as CompletedField | null;
    if (coarse?.key === "preview:" + sceneKey) {
      if (previewJob.hasVisiblePixels) { this.preview = coarse; this.previewRevision = this.projectionRevision; }
      this.completed = null;
    }
  }

  /** Discard pending work and cached pixels when the scene or effect view changes. */
  dispose(): void {
    this.cancelContinuation();
    this.job = null;
    this.completed = null;
    this.preview = null;
    this.previewRevision = -1;
    this.adaptivePreview = false;
    this.emptyKey = "";
    this.cameraMoving = false;
    this.projectionRevision++;
  }

  /** Draw retained geographic fields and a single-strike ruler in CSS pixels. */
  render(frames: readonly LaunchFrame[], width: number, height: number, multi: boolean, active: BandId | null): Geometry | null {
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
    const sceneKey = sceneKeyForFrames(frames);
    const key = this.projectionRevision + ":" + width + ":" + height + ":" + sceneKey;
    if (this.completed?.sceneKey !== sceneKey) this.completed = null;
    if (this.preview?.sceneKey !== sceneKey) this.preview = null;
    if (this.job?.key !== key) {
      this.cancelContinuation();
      this.job = null;
    }
    // Controller priming can be skipped during a transient map resize or
    // projection failure. Recover with a complete coarse mask on first paint.
    if (!multi && frames.length <= 10 && !this.completed && !this.preview && !this.job) {
      this.primeFirstEntry(frames, width, height);
    }
    if (this.cameraMoving && this.adaptivePreview && this.preview && this.projectionRevision - this.previewRevision >= 3) {
      this.refreshMovingPreview(frames, width, height, sceneKey);
    }
    if ((!this.cameraMoving || (!this.completed && !this.preview)) && !this.job && this.completed?.key !== key && this.emptyKey !== key) {
      this.job = this.createJob(key, sceneKey, frames, width, height, undefined, undefined, multi || frames.length > 10);
      if (this.job) this.advance(this.job);
    }
    context.imageSmoothingEnabled = true;
    // The full viewport mask may finish before easeTo emits its first move.
    // Once the camera moves, prefer the wider preview until a new full mask
    // is complete; otherwise the old viewport edge cuts across the circle.
    const visible = this.completed?.key === key ? this.completed : this.preview ?? this.completed;
    if (visible) {
      if (visible.key === key) context.drawImage(visible.canvas, 0, 0, width, height);
      else drawAudibleReprojection(context, visible.canvas, visible.mesh, this.camera, this.spec.restoreMeshAlpha);
    } else if (this.job?.allowPartial) context.drawImage(this.job.canvas, 0, 0, width, height);
    if (multi || frames.length > 1) return null;
    const first = frames[0]!.launch;
    const geometry = this.spec.buildInspection(this.camera, first.route.target, this.spec.radiusForLaunch(first), width, height);
    if (geometry) this.spec.drawInspection(inspection, geometry, active);
    return geometry;
  }

  /** Atomically replace a coarse viewport cache every few moving frames. */
  private refreshMovingPreview(frames: readonly LaunchFrame[], width: number, height: number, sceneKey: string): void {
    const previousCompleted = this.completed;
    const rectangle = { left: -width * 0.4, top: -height * 0.4, width: width * 1.8, height: height * 1.8 };
    const scale = Math.min(0.48, 100 / Math.sqrt(frames.length) / rectangle.width, 80 / Math.sqrt(frames.length) / rectangle.height);
    const job = this.createJob("preview:" + sceneKey, sceneKey, frames, width, height, scale, rectangle);
    if (!job) return;
    this.job = job;
    this.advance(job);
    if (this.job === job) {
      // The refresh must be a complete field before it can replace a cache.
      this.cancelContinuation();
      this.job = null;
      this.completed = previousCompleted;
      return;
    }
    this.preview = this.completed ?? { key: job.key, sceneKey, canvas: job.canvas, mesh: job.mesh };
    this.previewRevision = this.projectionRevision;
    this.completed = previousCompleted;
  }

  /** Allocate one mask; strike bounds and geographic points are resolved lazily. */
  private createJob(key: string, sceneKey: string, frames: readonly LaunchFrame[], width: number, height: number, requestedScale?: number, rectangle: SampleRectangle = { left: 0, top: 0, width, height }, allowPartial = false): CompositionJob | null {
    const scale = requestedScale ?? Math.min(0.48, 480 / width, 320 / height);
    const columns = Math.max(1, Math.ceil(rectangle.width * scale));
    const rows = Math.max(1, Math.ceil(rectangle.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = columns; canvas.height = rows;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const image = context.createImageData(columns, rows);
    return { key, sceneKey, frames, width, height, scale, sampleLeft: rectangle.left, sampleTop: rectangle.top, allowPartial, columns, canvas,
      mesh: captureAudibleReprojection(this.camera, rectangle.width, rectangle.height, rectangle.left, rectangle.top), context, image,
      points: new Array<GeoPoint | null | undefined>(columns * rows),
      peak: new Float32Array(columns * rows), sum: new Float32Array(columns * rows),
      hasVisiblePixels: false, nextFrame: 0, nextCell: 0, currentField: null };
  }

  /** Consume a fixed count of cells and strike candidates, then paint the partial field. */
  private advance(job: CompositionJob): void {
    if (this.job !== job) return;
    let evaluations = 0;
    let visitedFields = 0;
    while (job.nextFrame < job.frames.length && evaluations < RANGE_WORK_CHUNK && visitedFields < MAX_FIELDS_PER_CHUNK) {
      if (!job.currentField) {
        visitedFields++;
        const launch = job.frames[job.nextFrame]!.launch;
        const radiusKm = this.spec.radiusForLaunch(launch);
        const bounds = job.key.startsWith("preview:")
          ? { left: 0, top: 0, right: job.columns - 1, bottom: job.image.height - 1 }
          : rangeFieldBounds(this.camera, launch.route.target, radiusKm, job.width, job.height, job.scale);
        if (!bounds) { job.nextFrame++; continue; }
        job.currentField = { origin: launch.route.target, radiusKm, bounds };
      }
      const field = job.currentField;
      const fieldWidth = field.bounds.right - field.bounds.left + 1;
      const fieldHeight = field.bounds.bottom - field.bounds.top + 1;
      const fieldCells = fieldWidth * fieldHeight;
      while (job.nextCell < fieldCells && evaluations < RANGE_WORK_CHUNK) {
        const row = field.bounds.top + centerOutRow(Math.floor(job.nextCell / fieldWidth), fieldHeight);
        const column = field.bounds.left + job.nextCell % fieldWidth;
        job.nextCell++; evaluations++;
        const index = row * job.columns + column;
        let point = job.points[index];
        if (point === undefined) {
          try { point = this.camera.toGeo({ x: job.sampleLeft + (column + 0.5) / job.scale, y: job.sampleTop + (row + 0.5) / job.scale }); }
          catch { point = null; }
          job.points[index] = point;
        }
        if (!point) continue;
        const intensity = this.spec.intensity(surfaceDistanceKm(point, field.origin) / field.radiusKm);
        if (intensity <= 0) continue;
        job.hasVisiblePixels = true;
        job.peak[index] = Math.max(job.peak[index]!, intensity);
        job.sum[index] = job.sum[index]! + intensity;
        const [red, green, blue, alpha] = this.spec.color(combineBlastPeakAndSum(job.peak[index]!, job.sum[index]!));
        const offset = index * 4;
        job.image.data[offset] = red; job.image.data[offset + 1] = green;
        job.image.data[offset + 2] = blue; job.image.data[offset + 3] = alpha;
      }
      if (job.nextCell === fieldCells) { job.nextFrame++; job.nextCell = 0; job.currentField = null; }
    }
    job.context.putImageData(job.image, 0, 0);
    if (job.nextFrame === job.frames.length) {
      if (job.hasVisiblePixels) {
        this.completed = { key: job.key, sceneKey: job.sceneKey, canvas: job.canvas, mesh: job.mesh };
      } else {
        this.completed = null;
        this.emptyKey = job.key;
      }
      if (this.previewRevision !== this.projectionRevision) this.preview = null;
      this.job = null; this.continuationId = null;
      return;
    }
    this.continuationId = window.requestAnimationFrame(() => {
      this.continuationId = null;
      if (this.job !== job) return;
      this.advance(job);
      const context = this.canvas.getContext("2d");
      if (!context) return;
      const ratio = window.devicePixelRatio || 1;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, job.width, job.height);
      context.imageSmoothingEnabled = true;
      const visible = this.completed?.key === job.key ? this.completed : this.preview ?? this.completed;
      if (visible?.key === job.key) context.drawImage(visible.canvas, 0, 0, job.width, job.height);
      else if (visible) drawAudibleReprojection(context, visible.canvas, visible.mesh, this.camera, this.spec.restoreMeshAlpha);
      else if (job.allowPartial) context.drawImage(job.canvas, 0, 0, job.width, job.height);
    });
  }

  /** Stop a queued callback before an obsolete camera or scene can repaint. */
  private cancelContinuation(): void {
    if (this.continuationId !== null) window.cancelAnimationFrame(this.continuationId);
    this.continuationId = null;
  }
}
