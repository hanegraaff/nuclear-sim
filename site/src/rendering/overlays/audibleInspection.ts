import { AUDIBLE_BANDS, audibleBands, audibleIntensity, type AudibleBand, type AudibleBandId } from "../../domain/audible";
import { destinationPoint, type GeoPoint } from "../../domain/geodesy";
import { audibleColor } from "../effects/audiblePalette";
import type { MapCameraAdapter, ScreenPoint } from "../map/MapCameraAdapter";

/** One hearing band marker attached to its geographic midpoint. */
export interface ProjectedAudibleBand {
  readonly band: AudibleBand;
  readonly marker: ScreenPoint;
  readonly visible: boolean;
  readonly color: string;
}

/** Projected single-strike hearing ruler and inspection markers in CSS pixels. */
export interface AudibleInspectionGeometry {
  readonly ruler: readonly ScreenPoint[];
  readonly bands: readonly ProjectedAudibleBand[];
  readonly radiusKm: number;
  readonly width: number;
  readonly height: number;
}

/** Build a geodesic ruler and marker geometry from modeled kilometers at the current camera. */
export function buildAudibleInspection(camera: MapCameraAdapter, origin: GeoPoint, radiusKm: number, width: number, height: number): AudibleInspectionGeometry | null {
  if (width <= 0 || height <= 0) return null;
  const bearing = width <= 900 ? 34 : 42;
  try {
    const ruler = Array.from({ length: 43 }, (_, index) => camera.toScreen(destinationPoint(origin, radiusKm * index / 42, bearing)));
    if (ruler.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
    const bands = audibleBands(radiusKm).map((band) => {
      const marker = camera.toScreen(destinationPoint(origin, (band.innerKm + band.outerKm) / 2, bearing));
      const [red, green, blue] = audibleColor(audibleIntensity((band.innerKm + band.outerKm) / (2 * radiusKm)));
      return { band, marker, visible: Number.isFinite(marker.x) && Number.isFinite(marker.y) && marker.x >= 12 && marker.x <= width - 12 && marker.y >= 12 && marker.y <= height - 12, color: `rgb(${red},${green},${blue})` };
    });
    return { ruler, bands, radiusKm, width, height };
  } catch { return null; }
}

/** Paint a subtle dashed ruler and markers; the DOM label can avoid fixed controls. */
export function drawAudibleInspection(context: CanvasRenderingContext2D, geometry: AudibleInspectionGeometry, active: AudibleBandId | null): void {
  context.save(); context.strokeStyle = "#e1ffe9"; context.globalAlpha = 0.9; context.lineWidth = 1.2; context.setLineDash([4, 4]);
  context.beginPath(); geometry.ruler.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); context.setLineDash([]);
  for (const { band, marker, visible, color } of geometry.bands) {
    if (!visible) continue;
    context.shadowColor = color; context.shadowBlur = band.id === active ? 17 : 10; context.fillStyle = "rgba(5,7,7,.82)";
    context.beginPath(); context.arc(marker.x, marker.y, band.id === active ? 9 : 8, 0, Math.PI * 2); context.fill();
    context.shadowBlur = 0; context.strokeStyle = "#fff"; context.lineWidth = 2;
    context.beginPath(); context.arc(marker.x, marker.y, band.id === active ? 7 : 6, 0, Math.PI * 2); context.stroke();
    context.fillStyle = color; context.beginPath(); context.arc(marker.x, marker.y, band.id === active ? 4.5 : 3.5, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}

/** Color of one legend marker, sharing the same scalar palette as map pixels. */
export function audibleMarkerColor(id: AudibleBandId): string {
  const band = AUDIBLE_BANDS.find((candidate) => candidate.id === id)!;
  const [red, green, blue] = audibleColor(audibleIntensity((band.innerFactor + band.outerFactor) / 2));
  return `rgb(${red},${green},${blue})`;
}
