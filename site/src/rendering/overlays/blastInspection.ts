import type { BlastRadii } from "../../domain/blast";
import { blastZones, type BlastZone, type BlastZoneId } from "../../domain/blastZones";
import { destinationPoint, type GeoPoint } from "../../domain/geodesy";
import type { ScreenPoint } from "../map/MapCameraAdapter";

/** Only the geographic projection needed by inspection graphics. */
export interface InspectionCamera {
  toScreen(point: GeoPoint): ScreenPoint;
}

/** One projected ring or marker, with physical zone data retained in km and km². */
export interface ProjectedBlastZone {
  readonly zone: BlastZone;
  readonly color: string;
  readonly ring: readonly ScreenPoint[];
  readonly rulerPoint: ScreenPoint;
  readonly marker: ScreenPoint;
  readonly visible: boolean;
}

/** Screen geometry for one settled blast; distances remain derived from geography. */
export interface BlastInspectionGeometry {
  readonly zones: readonly ProjectedBlastZone[];
  readonly ruler: readonly ScreenPoint[];
  readonly endpoint: ScreenPoint;
  readonly radiusKm: number;
  readonly width: number;
  readonly height: number;
}

const ZONE_COLORS: Record<BlastZoneId, string> = {
  fireball: "#fff0a6",
  severe: "#f34a34",
  moderate: "#c82b78",
  light: "#7049c9",
};

/** Project a ring at constant great-circle radius, returning no ring past a projection horizon. */
function projectRing(camera: InspectionCamera, origin: GeoPoint, radiusKm: number): readonly ScreenPoint[] {
  try {
    const points = Array.from({ length: 120 }, (_, index) => camera.toScreen(destinationPoint(origin, radiusKm, index * 3)));
    return points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) ? points : [];
  } catch {
    return [];
  }
}

/** Keep the prototype's northeast ruler when it fits, then choose another visible quadrant. */
function rulerBearing(camera: InspectionCamera, origin: GeoPoint, radiusKm: number, width: number, height: number): number {
  const candidates = width <= 900 ? [126, 54, 234, 306] : [54, 306, 126, 234];
  let best = candidates[0]!;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const bearing of candidates) {
    let endpoint: ScreenPoint;
    try {
      endpoint = camera.toScreen(destinationPoint(origin, radiusKm, bearing));
    } catch {
      continue;
    }
    if (!Number.isFinite(endpoint.x) || !Number.isFinite(endpoint.y)) continue;
    const overflow = Math.max(0, 18 - endpoint.x) + Math.max(0, endpoint.x - (width - 130))
      + Math.max(0, 28 - endpoint.y) + Math.max(0, endpoint.y - (height - 28));
    const panelPenalty = width > 900 && endpoint.x < 380 && endpoint.y < 320 ? 400 : 0;
    const score = -overflow - panelPenalty;
    if (score > bestScore) { best = bearing; bestScore = score; }
    if (score === 0) break;
  }
  return best;
}

/** Build ring, ruler, and marker positions from a settled impact and current camera. */
export function buildBlastInspection(
  camera: InspectionCamera,
  origin: GeoPoint,
  radii: BlastRadii,
  width: number,
  height: number,
): BlastInspectionGeometry | null {
  if (width <= 0 || height <= 0) return null;
  const bearing = rulerBearing(camera, origin, radii.light, width, height);
  let ruler: ScreenPoint[];
  try {
    ruler = Array.from({ length: 37 }, (_, index) => camera.toScreen(destinationPoint(origin, radii.light * index / 36, bearing)));
  } catch {
    return null;
  }
  if (!ruler.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) return null;
  const start = ruler[0]!;
  const endpoint = ruler[ruler.length - 1]!;
  const length = Math.hypot(endpoint.x - start.x, endpoint.y - start.y) || 1;
  const normal = { x: -(endpoint.y - start.y) / length, y: (endpoint.x - start.x) / length };
  let previous: ScreenPoint | null = null;
  let overlapRun = 0;
  const zones = blastZones(radii).map((zone): ProjectedBlastZone => {
    const geographicMarker = destinationPoint(origin, (zone.innerKm + zone.outerKm) / 2, bearing);
    let point: ScreenPoint;
    try {
      point = camera.toScreen(geographicMarker);
    } catch {
      point = { x: Number.NaN, y: Number.NaN };
    }
    const overlaps = previous !== null && Math.hypot(point.x - previous.x, point.y - previous.y) < 16;
    overlapRun = overlaps ? overlapRun + 1 : 0;
    previous = point;
    const offset = overlapRun === 0 ? 0 : (overlapRun % 2 ? 1 : -1) * Math.ceil(overlapRun / 2) * 19;
    const marker = { x: point.x + normal.x * offset, y: point.y + normal.y * offset };
    return {
      zone,
      color: ZONE_COLORS[zone.id],
      ring: projectRing(camera, origin, zone.outerKm),
      rulerPoint: point,
      marker,
      visible: Number.isFinite(marker.x) && Number.isFinite(marker.y)
        && marker.x >= 12 && marker.x <= width - 12 && marker.y >= 12 && marker.y <= height - 12,
    };
  });
  return { zones, ruler, endpoint, radiusKm: radii.light, width, height };
}

/** Format physical distance for the ruler and tooltip without changing model units. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(km < 10 ? 2 : 1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

/** Format spherical annulus area in square kilometers for inspection. */
export function formatArea(areaKm2: number): string {
  if (areaKm2 < 0.01) return `${Math.round(areaKm2 * 1_000_000).toLocaleString()} m²`;
  if (areaKm2 < 1000) return `${areaKm2.toFixed(areaKm2 < 10 ? 2 : 1)} km²`;
  if (areaKm2 < 1_000_000) return `${Math.round(areaKm2).toLocaleString()} km²`;
  return `${(areaKm2 / 1_000_000).toFixed(1)}M km²`;
}

/** Paint the four geographic outlines and dashed radius over a settled field. */
export function drawBlastInspection(context: CanvasRenderingContext2D, geometry: BlastInspectionGeometry): void {
  context.save();
  for (const projected of geometry.zones) {
    if (projected.ring.length === 0) continue;
    context.beginPath();
    projected.ring.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
    context.closePath();
    context.strokeStyle = projected.color;
    context.globalAlpha = projected.zone.id === "light" ? 0.8 : 0.95;
    context.lineWidth = projected.zone.id === "fireball" ? 1.8 : 1.5;
    context.stroke();
  }
  context.globalAlpha = 0.92;
  context.strokeStyle = "#f5f7f1";
  context.lineWidth = 1.2;
  context.setLineDash([4, 4]);
  context.beginPath();
  geometry.ruler.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
  context.stroke();
  context.setLineDash([]);
  for (const projected of geometry.zones) {
    if (!projected.visible) continue;
    const { rulerPoint, marker } = projected;
    context.strokeStyle = projected.color;
    context.fillStyle = projected.color;
    context.lineWidth = 2;
    context.shadowColor = projected.color;
    context.shadowBlur = 7;
    context.beginPath();
    context.moveTo(rulerPoint.x - normalForTick(geometry, "x") * 7, rulerPoint.y - normalForTick(geometry, "y") * 7);
    context.lineTo(rulerPoint.x + normalForTick(geometry, "x") * 7, rulerPoint.y + normalForTick(geometry, "y") * 7);
    context.stroke();
    if (marker.x !== rulerPoint.x || marker.y !== rulerPoint.y) {
      context.beginPath(); context.moveTo(rulerPoint.x, rulerPoint.y); context.lineTo(marker.x, marker.y); context.stroke();
    }
    context.beginPath(); context.arc(rulerPoint.x, rulerPoint.y, 3.4, 0, Math.PI * 2); context.fill();
  }
  context.shadowBlur = 0;
  const before = geometry.ruler[geometry.ruler.length - 2]!;
  const angle = Math.atan2(geometry.endpoint.y - before.y, geometry.endpoint.x - before.x);
  context.beginPath();
  context.moveTo(geometry.endpoint.x - Math.sin(angle) * 5, geometry.endpoint.y + Math.cos(angle) * 5);
  context.lineTo(geometry.endpoint.x + Math.sin(angle) * 5, geometry.endpoint.y - Math.cos(angle) * 5);
  context.stroke();
  const label = `RADIUS  ${formatDistance(geometry.radiusKm)}`;
  context.font = "700 10px monospace";
  const labelWidth = context.measureText(label).width + 16;
  const labelX = geometry.endpoint.x + labelWidth + 18 < geometry.width
    ? geometry.endpoint.x + 9 : geometry.endpoint.x - labelWidth - 9;
  const labelY = Math.max(18, Math.min(geometry.height - 12, geometry.endpoint.y - 10));
  context.fillStyle = "rgba(7,9,9,.9)";
  context.fillRect(labelX, labelY - 13, labelWidth, 22);
  context.fillStyle = "#ff6b6b";
  context.fillText(label, labelX + 8, labelY + 2);
  context.restore();
}

/** Unit normal to the projected ruler for short colored marker ticks. */
function normalForTick(geometry: BlastInspectionGeometry, axis: "x" | "y"): number {
  const start = geometry.ruler[0]!;
  const end = geometry.endpoint;
  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  return axis === "x" ? -(end.y - start.y) / length : (end.x - start.x) / length;
}
