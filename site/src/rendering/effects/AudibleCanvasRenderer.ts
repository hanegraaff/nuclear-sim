import type { LaunchFrame } from "../../application/launch";
import { audibleRadiusForLaunch } from "../../application/effectPresentation";
import { audibleIntensity, type AudibleBandId } from "../../domain/audible";
import { EARTH_RADIUS_KM, normalizeLongitude, surfaceDistanceKm, type GeoPoint } from "../../domain/geodesy";
import { combineBlastPeakAndSum } from "../../domain/overlap";
import type { MapCameraAdapter } from "../map/MapCameraAdapter";
import { buildAudibleInspection, drawAudibleInspection, type AudibleInspectionGeometry } from "../overlays/audibleInspection";
import { audibleColor } from "./audiblePalette";

/** Maximum geographic cell contributions in one synchronous paint. */
export const AUDIBLE_WORK_CHUNK = 24_000;
const MAX_FIELDS_PER_CHUNK = 256;
const TAIL_FACTOR = 1.12;

/** Inclusive bounds of mask samples that can receive one hearing field. */
export interface AudibleRasterBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface AudibleField {
  readonly origin: GeoPoint;
  readonly radiusKm: number;
  readonly bounds: AudibleRasterBounds;
}

interface CompositionJob {
  readonly key: string;
  readonly frames: readonly LaunchFrame[];
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly columns: number;
  readonly context: CanvasRenderingContext2D;
  readonly image: ImageData;
  readonly points: (GeoPoint | null | undefined)[];
  readonly peak: Float32Array;
  readonly sum: Float32Array;
  nextFrame: number;
  nextCell: number;
  currentField: AudibleField | null;
}

/**
 * Conservative projected cap bound for a north-up, unpitched Mercator camera.
 * Pitched, rotated, polar, low-zoom world-copy, and wrap-ambiguous fields use
 * the whole mask. Width and height are CSS pixels; scale is samples per pixel;
 * origin is degrees and radiusKm is surface kilometers.
 * Returns null only when the field is provably outside the viewport.
 */
export function audibleFieldBounds(camera: MapCameraAdapter, origin: GeoPoint, radiusKm: number, width: number, height: number, scale: number): AudibleRasterBounds | null {
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

/** Continuous geographic hearing field, sampled through the current map camera. */
export class AudibleCanvasRenderer {
  private readonly mask = document.createElement("canvas");
  private projectionRevision = 0;
  private job: CompositionJob | null = null;
  private completedKey = "";
  private continuationId: number | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly camera: MapCameraAdapter, private readonly inspectionCanvas: HTMLCanvasElement) {}

  /** Cancel stale chunks after camera pan, zoom, pitch, bearing, or resize. */
  invalidateProjection(): void { this.projectionRevision++; this.cancelContinuation(); this.job = null; this.completedKey = ""; }

  /** Discard pending work and cached pixels when the scene or effect view changes. */
  dispose(): void { this.invalidateProjection(); }

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
    const key = this.projectionRevision + ":" + width + ":" + height + ":" + frames.map(({ launch }) =>
      [launch.id, launch.deviceId, launch.yieldMt, launch.route.target.longitude, launch.route.target.latitude].join(":")).join(",");
    if (this.job?.key !== key && this.completedKey !== key) {
      this.cancelContinuation();
      this.job = this.createJob(key, frames, width, height);
      this.completedKey = "";
      if (this.job) this.advance(this.job);
    }
    context.imageSmoothingEnabled = true;
    context.drawImage(this.mask, 0, 0, width, height);
    if (multi || frames.length > 1) return null;
    const first = frames[0]!.launch;
    const geometry = buildAudibleInspection(this.camera, first.route.target, audibleRadiusForLaunch(first), width, height);
    if (geometry) drawAudibleInspection(inspection, geometry, active);
    return geometry;
  }

  /** Allocate one mask; strike bounds and geographic points are resolved lazily. */
  private createJob(key: string, frames: readonly LaunchFrame[], width: number, height: number): CompositionJob | null {
    const scale = Math.min(0.48, 480 / width, 320 / height);
    const columns = Math.max(1, Math.ceil(width * scale));
    const rows = Math.max(1, Math.ceil(height * scale));
    this.mask.width = columns; this.mask.height = rows;
    const context = this.mask.getContext("2d");
    if (!context) return null;
    const image = context.createImageData(columns, rows);
    return { key, frames, width, height, scale, columns, context, image,
      points: new Array<GeoPoint | null | undefined>(columns * rows),
      peak: new Float32Array(columns * rows), sum: new Float32Array(columns * rows),
      nextFrame: 0, nextCell: 0, currentField: null };
  }

  /** Consume a fixed count of cells and strike candidates, then paint the partial field. */
  private advance(job: CompositionJob): void {
    if (this.job !== job) return;
    let evaluations = 0;
    let visitedFields = 0;
    while (job.nextFrame < job.frames.length && evaluations < AUDIBLE_WORK_CHUNK && visitedFields < MAX_FIELDS_PER_CHUNK) {
      if (!job.currentField) {
        visitedFields++;
        const launch = job.frames[job.nextFrame]!.launch;
        const radiusKm = audibleRadiusForLaunch(launch);
        const bounds = audibleFieldBounds(this.camera, launch.route.target, radiusKm, job.width, job.height, job.scale);
        if (!bounds) { job.nextFrame++; continue; }
        job.currentField = { origin: launch.route.target, radiusKm, bounds };
      }
      const field = job.currentField;
      const fieldWidth = field.bounds.right - field.bounds.left + 1;
      const fieldCells = fieldWidth * (field.bounds.bottom - field.bounds.top + 1);
      while (job.nextCell < fieldCells && evaluations < AUDIBLE_WORK_CHUNK) {
        const row = field.bounds.top + Math.floor(job.nextCell / fieldWidth);
        const column = field.bounds.left + job.nextCell % fieldWidth;
        job.nextCell++; evaluations++;
        const index = row * job.columns + column;
        let point = job.points[index];
        if (point === undefined) {
          try { point = this.camera.toGeo({ x: (column + 0.5) / job.scale, y: (row + 0.5) / job.scale }); }
          catch { point = null; }
          job.points[index] = point;
        }
        if (!point) continue;
        const intensity = audibleIntensity(surfaceDistanceKm(point, field.origin) / field.radiusKm);
        if (intensity <= 0) continue;
        job.peak[index] = Math.max(job.peak[index]!, intensity);
        job.sum[index] = job.sum[index]! + intensity;
        const [red, green, blue, alpha] = audibleColor(combineBlastPeakAndSum(job.peak[index]!, job.sum[index]!));
        const offset = index * 4;
        job.image.data[offset] = red; job.image.data[offset + 1] = green;
        job.image.data[offset + 2] = blue; job.image.data[offset + 3] = alpha;
      }
      if (job.nextCell === fieldCells) { job.nextFrame++; job.nextCell = 0; job.currentField = null; }
    }
    job.context.putImageData(job.image, 0, 0);
    if (job.nextFrame === job.frames.length) {
      this.completedKey = job.key; this.job = null; this.continuationId = null;
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
      context.drawImage(this.mask, 0, 0, job.width, job.height);
    });
  }

  /** Stop a queued callback before an obsolete camera or scene can repaint. */
  private cancelContinuation(): void {
    if (this.continuationId !== null) window.cancelAnimationFrame(this.continuationId);
    this.continuationId = null;
  }
}
