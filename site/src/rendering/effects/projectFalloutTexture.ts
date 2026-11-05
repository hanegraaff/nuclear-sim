import type { MapCameraAdapter, ScreenPoint } from "../map/MapCameraAdapter";
import { normalizeLongitude, surfaceDistanceKm } from "../../domain/geodesy";
import type { InspectionCamera } from "../overlays/blastInspection";
import type { FalloutTexture } from "./falloutTexture";

/**
 * Reproject a cached geographic texture into a bounded scalar mask. Each
 * triangle is affine only within a small geographic patch; all its vertices
 * come from the current camera. Discontinuous world-wrap/horizon faces are
 * rejected, and triangles wholly outside the viewport are culled.
 */
export function projectFalloutTexture(context: CanvasRenderingContext2D, texture: FalloutTexture, camera: InspectionCamera & Partial<Pick<MapCameraAdapter, "snapshot" | "toGeo">>, width: number, height: number): void {
  const { meshColumns: columns, meshRows: rows, canvas } = texture;
  const points = texture.mesh.map((point) => {
    try {
      const projected = camera.toScreen(point);
      // Behind-horizon projection can be finite but invert to a different
      // ground point. Fifty meters tolerates numerical camera precision near
      // the horizon while rejecting back-facing triangles, without resampling
      // the scalar model or inverting every texture pixel.
      if (camera.toGeo && surfaceDistanceKm(point, camera.toGeo(projected)) > 0.05) return { x: NaN, y: NaN };
      return projected;
    }
    catch { return { x: NaN, y: NaN }; }
  });
  const centerLongitude = camera.snapshot?.().center.longitude ?? texture.field.origin.longitude;
  const wrapped = texture.mesh.map((point) => normalizeLongitude(point.longitude - centerLongitude));
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const top = y * (columns + 1) + x;
    const bottom = top + columns + 1;
    const a = points[top]!; const b = points[top + 1]!;
    const c = points[bottom]!; const d = points[bottom + 1]!;
    const sx = x * canvas.width / columns; const sy = y * canvas.height / rows;
    const sw = canvas.width / columns; const sh = canvas.height / rows;
    const faceLongitudes = [wrapped[top]!, wrapped[top + 1]!, wrapped[bottom]!, wrapped[bottom + 1]!];
    if (Math.max(...faceLongitudes) - Math.min(...faceLongitudes) > 180) continue;
    drawTriangle(context, canvas, [a, b, c], [{ x: sx, y: sy }, { x: sx + sw, y: sy }, { x: sx, y: sy + sh }], width, height);
    drawTriangle(context, canvas, [b, d, c], [{ x: sx + sw, y: sy }, { x: sx + sw, y: sy + sh }, { x: sx, y: sy + sh }], width, height);
  }
}

/** Map one source triangle onto its geographic screen triangle using a 2D affine transform. */
function drawTriangle(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, target: readonly ScreenPoint[], source: readonly ScreenPoint[], width: number, height: number): void {
  if (!target.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) return;
  if (target.every((point) => point.x < 0) || target.every((point) => point.x > width)
    || target.every((point) => point.y < 0) || target.every((point) => point.y > height)) return;
  // Valid geographic faces can be much larger than the screen at high zoom.
  // Canvas clips their transformed image to the viewport; screen-edge length
  // must never be used as a proxy for a world-wrap or horizon discontinuity.
  const [p, q, r] = source as readonly [ScreenPoint, ScreenPoint, ScreenPoint];
  const [a, b, c] = target as readonly [ScreenPoint, ScreenPoint, ScreenPoint];
  const determinant = (q.x - p.x) * (r.y - p.y) - (r.x - p.x) * (q.y - p.y);
  const xx = ((b.x - a.x) * (r.y - p.y) - (c.x - a.x) * (q.y - p.y)) / determinant;
  const xy = ((c.x - a.x) * (q.x - p.x) - (b.x - a.x) * (r.x - p.x)) / determinant;
  const yx = ((b.y - a.y) * (r.y - p.y) - (c.y - a.y) * (q.y - p.y)) / determinant;
  const yy = ((c.y - a.y) * (q.x - p.x) - (b.y - a.y) * (r.x - p.x)) / determinant;
  context.save();
  context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.lineTo(c.x, c.y); context.closePath(); context.clip();
  context.transform(xx, yx, xy, yy, a.x - xx * p.x - xy * p.y, a.y - yx * p.x - yy * p.y);
  context.drawImage(canvas, 0, 0);
  context.restore();
}
