import type { Launch } from "../../application/launch";
import { MAX_SURFACE_DISTANCE_KM, type BlastRadii } from "../../domain/blast";
import { destinationPoint, type GeoPoint } from "../../domain/geodesy";
import type { MapCameraAdapter, ScreenPoint } from "../map/MapCameraAdapter";

const FLASH_MS = 1100;
const FALLOFF_FACTOR = 1.24;

/** Ease used by the prototype's expanding field: fast initially, slow near the edge. */
export function blastExpansion(progress: number): number {
  const bounded = Math.max(0, Math.min(1, progress));
  return 1 - (1 - bounded) ** 2.15;
}

/** Color and opacity at a surface distance in km for one modeled blast. */
export function blastColor(distanceKm: number, radii: BlastRadii): { red: number; green: number; blue: number; alpha: number } {
  const stops = [
    { distance: 0, color: [255, 255, 247], alpha: 0.995 },
    { distance: radii.fireball * 0.52, color: [255, 248, 204], alpha: 0.97 },
    { distance: radii.fireball, color: [255, 167, 48], alpha: 0.84 },
    { distance: radii.severe, color: [242, 63, 48], alpha: 0.62 },
    { distance: radii.moderate, color: [201, 40, 111], alpha: 0.46 },
    { distance: radii.light, color: [93, 59, 169], alpha: 0.36 },
  ];
  const upperIndex = Math.max(1, stops.findIndex((stop) => distanceKm <= stop.distance));
  const lower = stops[upperIndex - 1]!;
  const upper = stops[upperIndex] ?? stops[stops.length - 1]!;
  const fraction = Math.max(0, Math.min(1, (distanceKm - lower.distance) / Math.max(0.0001, upper.distance - lower.distance)));
  return {
    red: Math.round(lower.color[0]! + (upper.color[0]! - lower.color[0]!) * fraction),
    green: Math.round(lower.color[1]! + (upper.color[1]! - lower.color[1]!) * fraction),
    blue: Math.round(lower.color[2]! + (upper.color[2]! - lower.color[2]!) * fraction),
    alpha: lower.alpha + (upper.alpha - lower.alpha) * fraction,
  };
}

/** Paints one geographic blast on a transparent Canvas 2D overlay. */
export class BlastCanvasRenderer {
  constructor(private readonly canvas: HTMLCanvasElement, private readonly camera: MapCameraAdapter) {}

  /** Reproject and repaint at the launch age in ms; an absent launch clears the layer. */
  render(launch: Launch | null, elapsedMs: number, width: number, height: number): void {
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    const context = this.canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!launch || elapsedMs < launch.flightMs || width <= 0 || height <= 0) return;

    const center = this.camera.toScreen(launch.route.target);
    const blastAge = Math.max(0, elapsedMs - launch.flightMs);
    const progress = Math.min(1, blastAge / launch.blastMs);
    const travelledKm = launch.radii.light * blastExpansion(progress);
    const maxRadius = Math.hypot(width, height) * 3;
    const radius = (distanceKm: number) => this.projectedRadius(launch.route.target, distanceKm, maxRadius);
    if (travelledKm > 0) this.drawField(context, center, radius(travelledKm), travelledKm, launch.radii);
    if (progress > 0 && progress < 1) this.drawShockwave(context, center, radius(travelledKm));
    if (blastAge < FLASH_MS) this.drawFlash(context, center, blastAge, Math.min(width, height));
  }

  /** Convert a geographic radius to local CSS pixels; cap far-side projections at viewport scale. */
  private projectedRadius(origin: GeoPoint, distanceKm: number, maxRadius: number): number {
    if (distanceKm <= 0) return 0;
    const probeKm = Math.min(1, distanceKm, MAX_SURFACE_DISTANCE_KM / 2);
    const east = this.camera.toScreen(destinationPoint(origin, probeKm, 90));
    const west = this.camera.toScreen(destinationPoint(origin, probeKm, 270));
    const north = this.camera.toScreen(destinationPoint(origin, probeKm, 0));
    const south = this.camera.toScreen(destinationPoint(origin, probeKm, 180));
    const horizontal = Math.hypot(east.x - west.x, east.y - west.y) / 2;
    const vertical = Math.hypot(north.x - south.x, north.y - south.y) / 2;
    const pixelsPerKm = Math.max(0, (horizontal + vertical) / (2 * probeKm));
    if (!Number.isFinite(pixelsPerKm)) return 0;
    // The local derivative keeps large fields and antimeridian copies stable.
    return Math.min(maxRadius, Math.max(0, distanceKm * pixelsPerKm));
  }

  /** Draw the prototype's translucent white, orange, magenta, and purple field. */
  private drawField(context: CanvasRenderingContext2D, center: ScreenPoint, radius: number, travelledKm: number, radii: BlastRadii): void {
    if (radius < 1) return;
    context.save();
    const gradient = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
    for (let index = 0; index <= 24; index++) {
      const fraction = index / 24;
      const color = blastColor(travelledKm * fraction, radii);
      gradient.addColorStop(fraction, `rgba(${color.red},${color.green},${color.blue},${color.alpha})`);
    }
    context.fillStyle = gradient;
    context.beginPath(); context.arc(center.x, center.y, radius, 0, Math.PI * 2); context.fill();

    const falloff = context.createRadialGradient(center.x, center.y, radius * 0.68, center.x, center.y, radius * FALLOFF_FACTOR);
    falloff.addColorStop(0, "rgba(142,48,156,0.08)");
    falloff.addColorStop(0.56, "rgba(112,73,201,0.3)");
    falloff.addColorStop(1, "rgba(63,36,130,0)");
    context.fillStyle = falloff;
    context.beginPath(); context.arc(center.x, center.y, radius * FALLOFF_FACTOR, 0, Math.PI * 2); context.fill();
    context.restore();
  }

  /** Overlay the brief white inner stroke and red outer shock ring. */
  private drawShockwave(context: CanvasRenderingContext2D, center: ScreenPoint, radius: number): void {
    if (radius < 1) return;
    context.save();
    context.beginPath(); context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    context.strokeStyle = "#ff3b24"; context.lineWidth = 10;
    context.shadowColor = "#ff2b18"; context.shadowBlur = 22; context.stroke();
    context.strokeStyle = "#fffdf4"; context.lineWidth = 3.2; context.shadowBlur = 0; context.stroke();
    context.restore();
  }

  /** Paint the 1.1-second white-yellow-orange impact bloom above the field. */
  private drawFlash(context: CanvasRenderingContext2D, center: ScreenPoint, ageMs: number, compactDimension: number): void {
    const life = Math.max(0, ageMs / FLASH_MS);
    const opacity = Math.min(1, life / 0.035) * (1 - life) ** 1.55;
    if (opacity <= 0) return;
    const auraRadius = 34 + Math.sqrt(life) * Math.min(220, compactDimension * 0.4);
    const coreRadius = 8 + life ** 0.38 * Math.min(82, compactDimension * 0.14);
    context.save();
    context.globalCompositeOperation = "screen";
    const aura = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, auraRadius);
    aura.addColorStop(0, `rgba(255,255,255,${0.98 * opacity})`);
    aura.addColorStop(0.12, `rgba(255,251,221,${0.95 * opacity})`);
    aura.addColorStop(0.38, `rgba(255,178,69,${0.6 * opacity})`);
    aura.addColorStop(0.72, `rgba(255,62,20,${0.24 * opacity})`);
    aura.addColorStop(1, "rgba(158,14,0,0)");
    context.fillStyle = aura;
    context.beginPath(); context.arc(center.x, center.y, auraRadius, 0, Math.PI * 2); context.fill();
    const core = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, coreRadius);
    core.addColorStop(0, `rgba(255,255,255,${opacity})`);
    core.addColorStop(0.26, `rgba(255,255,238,${0.96 * opacity})`);
    core.addColorStop(0.66, `rgba(255,205,92,${0.72 * opacity})`);
    core.addColorStop(1, "rgba(255,88,24,0)");
    context.fillStyle = core;
    context.beginPath(); context.arc(center.x, center.y, coreRadius, 0, Math.PI * 2); context.fill();
    context.restore();
  }
}
