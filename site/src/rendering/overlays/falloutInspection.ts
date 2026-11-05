import { falloutCenterline, falloutZones, type FalloutBandId, type FalloutFootprint, type FalloutZone } from "../../domain/fallout";
import type { InspectionCamera } from "./blastInspection";
import { formatDistance } from "./blastInspection";
import type { ScreenPoint } from "../map/MapCameraAdapter";

/** Rendering palette for the shared physical fallout bands. */
export const FALLOUT_COLORS: Readonly<Record<FalloutBandId, string>> = { trace: "#6946c7", elevated: "#d92f92", high: "#ff5b27", extreme: "#fff0a6" };

/** One projected inspection mark retaining its physical screening span. */
export interface ProjectedFalloutZone {
  readonly zone: FalloutZone;
  readonly marker: ScreenPoint;
  readonly visible: boolean;
}

/** Camera-specific H+24 ruler and marks; geographic field remains model-owned. */
export interface FalloutInspectionGeometry {
  readonly zones: readonly ProjectedFalloutZone[];
  readonly ruler: readonly ScreenPoint[];
  readonly field: FalloutFootprint;
  readonly width: number;
  readonly height: number;
}

/** Project one field's curved H+24 ruler and inspection positions into CSS pixels. */
export function buildFalloutInspection(camera: InspectionCamera, field: FalloutFootprint, width: number, height: number): FalloutInspectionGeometry | null {
  try {
    const ruler = Array.from({ length: 43 }, (_, i) => camera.toScreen(falloutCenterline(field, i / 42)));
    if (!ruler.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) return null;
    const zones = falloutZones(field.dimensions).map((zone) => {
      const marker = camera.toScreen(falloutCenterline(field, (zone.innerKm + zone.outerKm) / (2 * field.dimensions.lengthKm)));
      return { zone, marker, visible: Number.isFinite(marker.x) && Number.isFinite(marker.y) && marker.x >= 12 && marker.x <= width - 12 && marker.y >= 12 && marker.y <= height - 12 };
    });
    return { zones, ruler, field, width, height };
  } catch { return null; }
}

/** Paint ruler and visible marks together to avoid camera-frame marker lag. */
export function drawFalloutInspection(context: CanvasRenderingContext2D, geometry: FalloutInspectionGeometry, active: FalloutBandId | null): void {
  context.save();
  context.strokeStyle = "#fff8e7";
  context.globalAlpha = 0.94;
  context.lineWidth = 1.2;
  context.setLineDash([4, 4]);
  context.beginPath();
  geometry.ruler.forEach((p, i) => i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y));
  context.stroke();
  context.setLineDash([]);
  for (const { zone, marker, visible } of geometry.zones) {
    if (!visible) continue;
    const color = FALLOUT_COLORS[zone.band.id];
    context.shadowColor = color;
    context.shadowBlur = active === zone.band.id ? 17 : 10;
    context.fillStyle = "rgba(5,7,7,.82)";
    context.beginPath(); context.arc(marker.x, marker.y, active === zone.band.id ? 9 : 8, 0, Math.PI * 2); context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "#fff"; context.lineWidth = 2;
    context.beginPath(); context.arc(marker.x, marker.y, active === zone.band.id ? 7 : 6, 0, Math.PI * 2); context.stroke();
    context.fillStyle = color;
    context.beginPath(); context.arc(marker.x, marker.y, active === zone.band.id ? 4.5 : 3.5, 0, Math.PI * 2); context.fill();
  }
  const end = geometry.ruler.at(-1)!;
  const label = `H+24  ${formatDistance(geometry.field.dimensions.lengthKm)} · ${geometry.field.wind.direction}`;
  context.font = "700 10px monospace";
  const textWidth = context.measureText(label).width + 16;
  const x = Math.max(8, Math.min(geometry.width - textWidth - 8, end.x + textWidth + 18 < geometry.width ? end.x + 9 : end.x - textWidth - 9));
  const y = Math.max(18, Math.min(geometry.height - 12, end.y - 10));
  context.fillStyle = "rgba(7,9,9,.9)"; context.fillRect(x, y - 13, textWidth, 22);
  context.fillStyle = "#ff6b6b"; context.fillText(label, x + 8, y + 2);
  context.restore();
}
