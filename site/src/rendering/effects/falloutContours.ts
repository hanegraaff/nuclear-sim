import { FALLOUT_BANDS, type FalloutBandId } from "../../domain/fallout";
import { normalizeLongitude, type GeoPoint } from "../../domain/geodesy";
import type { MapCameraAdapter } from "../map/MapCameraAdapter";
import type { InspectionCamera } from "../overlays/blastInspection";
import { FALLOUT_COLORS } from "../overlays/falloutInspection";
import { falloutTexturePoint, type FalloutTexture } from "./falloutTexture";

/** Geographic contour segments, computed once alongside a scalar texture. */
export interface FalloutContour {
  readonly band: FalloutBandId;
  readonly segments: readonly (readonly [GeoPoint, GeoPoint])[];
}

/** March cached scalar samples into geographic segments, without using a camera. */
export function buildFalloutContours(texture: FalloutTexture): readonly FalloutContour[] {
  const { canvas: { width, height }, values, field, bounds } = texture;
  return FALLOUT_BANDS.filter((band) => band.id !== "extreme").map((band) => {
    const segments: [GeoPoint, GeoPoint][] = [];
    for (let y = 0; y < height - 1; y++) for (let x = 0; x < width - 1; x++) {
      const points = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]] as const;
      const samples = [values[y * width + x]!, values[y * width + x + 1]!, values[(y + 1) * width + x + 1]!, values[(y + 1) * width + x]!];
      const crossings: GeoPoint[] = [];
      for (let edge = 0; edge < 4; edge++) {
        const next = (edge + 1) % 4;
        if ((samples[edge]! >= band.threshold) === (samples[next]! >= band.threshold)) continue;
        const fraction = (band.threshold - samples[edge]!) / (samples[next]! - samples[edge]!);
        crossings.push(falloutTexturePoint(field, bounds,
          (points[edge]![0] + (points[next]![0] - points[edge]![0]) * fraction) / (width - 1),
          (points[edge]![1] + (points[next]![1] - points[edge]![1]) * fraction) / (height - 1)));
      }
      for (let i = 0; i + 1 < crossings.length; i += 2) segments.push([crossings[i]!, crossings[i + 1]!]);
    }
    return { band: band.id, segments };
  });
}

/** Reproject cached contours in the same current camera frame as the scalar mesh and markers. */
export function drawFalloutContours(context: CanvasRenderingContext2D, contours: readonly FalloutContour[], camera: InspectionCamera & Partial<Pick<MapCameraAdapter, "snapshot">>): void {
  context.save(); context.lineWidth = 1.3; context.globalAlpha = 0.8;
  const centerLongitude = camera.snapshot?.().center.longitude;
  for (const contour of contours) {
    context.strokeStyle = FALLOUT_COLORS[contour.band]; context.beginPath();
    for (const [start, end] of contour.segments) {
      const a = camera.toScreen(start); const b = camera.toScreen(end);
      if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) continue;
      if (centerLongitude !== undefined && Math.abs(normalizeLongitude(start.longitude - centerLongitude) - normalizeLongitude(end.longitude - centerLongitude)) > 180) continue;
      context.moveTo(a.x, a.y); context.lineTo(b.x, b.y);
    }
    context.stroke();
  }
  context.restore();
}
