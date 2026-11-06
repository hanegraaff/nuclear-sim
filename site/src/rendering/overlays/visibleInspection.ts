import { VISIBLE_BANDS, visibleBands, visibleIntensity, type VisibleBand, type VisibleBandId } from "../../domain/visible";
import { destinationPoint, type GeoPoint } from "../../domain/geodesy";
import { visibleColor } from "../effects/visiblePalette";
import type { MapCameraAdapter, ScreenPoint } from "../map/MapCameraAdapter";

/** One direct-fireball sightline marker attached to its geographic midpoint. */
export interface ProjectedVisibleBand {
  readonly band: VisibleBand;
  readonly marker: ScreenPoint;
  readonly visible: boolean;
  readonly color: string;
}

/** Projected single-strike visible ruler and marker geometry in CSS pixels. */
export interface VisibleInspectionGeometry {
  readonly ruler: readonly ScreenPoint[];
  readonly bands: readonly ProjectedVisibleBand[];
  readonly radiusKm: number;
  readonly width: number;
  readonly height: number;
}

/** Project the geodesic visible ruler and four band midpoints through the current map camera. */
export function buildVisibleInspection(camera: MapCameraAdapter, origin: GeoPoint, radiusKm: number, width: number, height: number): VisibleInspectionGeometry | null {
  if (width <= 0 || height <= 0) return null;
  const bearing = width <= 900 ? 34 : 42;
  try {
    const ruler = Array.from({ length: 43 }, (_, index) => camera.toScreen(destinationPoint(origin, radiusKm * index / 42, bearing)));
    if (ruler.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
    const bands = visibleBands(radiusKm).map((band) => {
      const marker = camera.toScreen(destinationPoint(origin, (band.innerKm + band.outerKm) / 2, bearing));
      const [red, green, blue] = visibleColor(visibleIntensity((band.innerKm + band.outerKm) / (2 * radiusKm)));
      return { band, marker, visible: Number.isFinite(marker.x) && Number.isFinite(marker.y) && marker.x >= 12 && marker.x <= width - 12 && marker.y >= 12 && marker.y <= height - 12, color: `rgb(${red},${green},${blue})` };
    });
    return { ruler, bands, radiusKm, width, height };
  } catch { return null; }
}

/** Paint a white dashed geographic sightline and blue band markers in CSS pixels. */
export function drawVisibleInspection(context: CanvasRenderingContext2D, geometry: VisibleInspectionGeometry, active: VisibleBandId | null): void {
  context.save(); context.strokeStyle = "#e5f5ff"; context.globalAlpha = 0.9; context.lineWidth = 1.2; context.setLineDash([4, 4]);
  context.beginPath(); geometry.ruler.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); context.setLineDash([]);
  for (const { band, marker, visible, color } of geometry.bands) {
    if (!visible) continue;
    context.shadowColor = color; context.shadowBlur = band.id === active ? 17 : 10; context.fillStyle = "rgba(5,7,13,.82)";
    context.beginPath(); context.arc(marker.x, marker.y, band.id === active ? 9 : 8, 0, Math.PI * 2); context.fill();
    context.shadowBlur = 0; context.strokeStyle = "#fff"; context.lineWidth = 2;
    context.beginPath(); context.arc(marker.x, marker.y, band.id === active ? 7 : 6, 0, Math.PI * 2); context.stroke();
    context.fillStyle = color; context.beginPath(); context.arc(marker.x, marker.y, band.id === active ? 4.5 : 3.5, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}

/** Marker color sampled from the same smooth visible field palette. */
export function visibleMarkerColor(id: VisibleBandId): string {
  const band = VISIBLE_BANDS.find((candidate) => candidate.id === id)!;
  const [red, green, blue] = visibleColor(visibleIntensity((band.innerFactor + band.outerFactor) / 2));
  return `rgb(${red},${green},${blue})`;
}
