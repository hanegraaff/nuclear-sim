import type { Launch } from "../../application/launch";
import type { BlastRadii } from "../../domain/blast";
import { destinationPoint, type GeoPoint } from "../../domain/geodesy";
import type { MapCameraAdapter, ScreenPoint } from "../map/MapCameraAdapter";
import { buildBlastDistanceGrid, type BlastDistanceGrid } from "./blastFieldGeometry";
import { buildBlastInspection, drawBlastInspection, type BlastInspectionGeometry } from "../overlays/blastInspection";

const FLASH_MS = 1100;
const FALLOFF_FACTOR = 1.24;

type BlastColor = { readonly red: number; readonly green: number; readonly blue: number; readonly alpha: number };
type ColorAnchor = { readonly distance: number; readonly color: readonly [number, number, number]; readonly alpha: number };

interface CachedBlastField {
  readonly launchId: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly grid: BlastDistanceGrid;
  readonly colors: Uint8ClampedArray;
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly image: ImageData;
}

/** Ease used by the prototype's expanding field: fast initially, slow near the edge. */
export function blastExpansion(progress: number): number {
  const bounded = Math.max(0, Math.min(1, progress));
  return 1 - (1 - bounded) ** 2.15;
}

/** Ordered color anchors preserve the prototype's narrow fireball boundary. */
function blastColorAnchors(radii: BlastRadii): readonly ColorAnchor[] {
  return [
    { distance: 0, color: [255, 255, 247], alpha: 0.995 },
    { distance: radii.fireball * 0.52, color: [255, 248, 204], alpha: 0.97 },
    { distance: radii.fireball, color: [255, 167, 48], alpha: 0.84 },
    { distance: radii.severe, color: [242, 63, 48], alpha: 0.62 },
    { distance: radii.moderate, color: [201, 40, 111], alpha: 0.46 },
    { distance: radii.light, color: [93, 59, 169], alpha: 0.36 },
  ];
}

/** Interpolate physical-distance anchors, including each narrow boundary. */
function colorAtDistance(distanceKm: number, anchors: readonly ColorAnchor[]): BlastColor {
  const upperIndex = Math.max(1, anchors.findIndex((anchor) => distanceKm <= anchor.distance));
  const lower = anchors[upperIndex - 1]!;
  const upper = anchors[upperIndex] ?? anchors[anchors.length - 1]!;
  const fraction = Math.max(0, Math.min(1, (distanceKm - lower.distance) / Math.max(0.0001, upper.distance - lower.distance)));
  return {
    red: Math.round(lower.color[0]! + (upper.color[0]! - lower.color[0]!) * fraction),
    green: Math.round(lower.color[1]! + (upper.color[1]! - lower.color[1]!) * fraction),
    blue: Math.round(lower.color[2]! + (upper.color[2]! - lower.color[2]!) * fraction),
    alpha: lower.alpha + (upper.alpha - lower.alpha) * fraction,
  };
}

/** Color and opacity at a surface distance in km for one modeled blast. */
export function blastColor(distanceKm: number, radii: BlastRadii): BlastColor {
  return colorAtDistance(distanceKm, blastColorAnchors(radii));
}

/** Paints one geographic blast on a transparent Canvas 2D overlay. */
export class BlastCanvasRenderer {
  private field: CachedBlastField | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly camera: MapCameraAdapter) {}

  /** Drop sampled distances when pan, zoom, pitch, rotation, or resize changes the camera. */
  invalidateProjection(): void {
    this.field = null;
  }

  /** Reproject and repaint at the launch age in ms; return settled marker geometry. */
  render(launch: Launch | null, elapsedMs: number, width: number, height: number): BlastInspectionGeometry | null {
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    const context = this.canvas.getContext("2d");
    if (!context) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!launch || elapsedMs < launch.flightMs || width <= 0 || height <= 0) {
      if (!launch) this.field = null;
      return null;
    }

    const center = this.camera.toScreen(launch.route.target);
    const blastAge = Math.max(0, elapsedMs - launch.flightMs);
    const progress = Math.min(1, blastAge / launch.blastMs);
    const travelledKm = launch.radii.light * blastExpansion(progress);
    if (travelledKm > 0) {
      const field = this.ensureField(launch, width, height);
      if (field) this.drawField(context, field, travelledKm, launch.radii);
      if (progress < 1) this.drawSun(context, center, launch.route.target, launch.radii, Math.min(1, blastAge / 650));
    }
    if (progress > 0 && progress < 1) this.drawShockwave(context, launch.route.target, travelledKm);
    if (blastAge < FLASH_MS) this.drawFlash(context, center, blastAge, Math.min(width, height));
    if (progress < 1) return null;
    const inspection = buildBlastInspection(this.camera, launch.route.target, launch.radii, width, height);
    if (inspection) drawBlastInspection(context, inspection);
    this.drawSun(context, center, launch.route.target, launch.radii, 1);
    return inspection;
  }

  /** Build the visible geographic distance mask once per strike and camera state. */
  private ensureField(launch: Launch, width: number, height: number): CachedBlastField | null {
    if (this.field?.launchId === launch.id && this.field.viewportWidth === width && this.field.viewportHeight === height) return this.field;
    const grid = buildBlastDistanceGrid(this.camera, launch.route.target, width, height);
    const canvas = document.createElement("canvas");
    canvas.width = grid.width;
    canvas.height = grid.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const image = context.createImageData(grid.width, grid.height);
    const colors = new Uint8ClampedArray(grid.distancesKm.length * 4);
    const anchors = blastColorAnchors(launch.radii);
    for (let index = 0; index < grid.distancesKm.length; index++) {
      const distance = grid.distancesKm[index]!;
      if (!Number.isFinite(distance) || distance > launch.radii.light) continue;
      const color = colorAtDistance(distance, anchors);
      const offset = index * 4;
      colors[offset] = color.red;
      colors[offset + 1] = color.green;
      colors[offset + 2] = color.blue;
      colors[offset + 3] = Math.round(color.alpha * 255);
    }
    this.field = { launchId: launch.id, viewportWidth: width, viewportHeight: height, grid, colors, canvas, context, image };
    return this.field;
  }

  /** Paint exact color anchors at sampled geodesic distances and feather the edge. */
  private drawField(context: CanvasRenderingContext2D, field: CachedBlastField, travelledKm: number, radii: BlastRadii): void {
    const data = field.image.data;
    const falloffOuterKm = travelledKm * FALLOFF_FACTOR;
    for (let index = 0; index < field.grid.distancesKm.length; index++) {
      const distance = field.grid.distancesKm[index]!;
      const offset = index * 4;
      if (distance <= travelledKm) {
        data[offset] = field.colors[offset]!;
        data[offset + 1] = field.colors[offset + 1]!;
        data[offset + 2] = field.colors[offset + 2]!;
        data[offset + 3] = field.colors[offset + 3]!;
      } else if (distance <= Math.min(falloffOuterKm, radii.light * FALLOFF_FACTOR)) {
        const fraction = (distance - travelledKm) / Math.max(0.000001, falloffOuterKm - travelledKm);
        const fade = 1 - fraction * fraction * (3 - 2 * fraction);
        data[offset] = 112;
        data[offset + 1] = 73;
        data[offset + 2] = 201;
        data[offset + 3] = Math.round(76 * fade);
      } else {
        data[offset + 3] = 0;
      }
    }
    field.context.putImageData(field.image, 0, 0);
    context.save();
    context.imageSmoothingEnabled = true;
    context.drawImage(field.canvas, 0, 0, field.viewportWidth, field.viewportHeight);
    context.restore();
  }

  /** Trace the growing shock ring from geodesic destinations rather than a pixel circle. */
  private drawShockwave(context: CanvasRenderingContext2D, origin: GeoPoint, travelledKm: number): void {
    if (travelledKm <= 0 || travelledKm >= 10_000) return;
    context.save();
    context.beginPath();
    for (let index = 0; index < 120; index++) {
      const point = this.camera.toScreen(destinationPoint(origin, travelledKm, index * 3));
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.closePath();
    context.strokeStyle = "#ff3b24"; context.lineWidth = 10;
    context.shadowColor = "#ff2b18"; context.shadowBlur = 22; context.stroke();
    context.strokeStyle = "#fffdf4"; context.lineWidth = 3.2; context.shadowBlur = 0; context.stroke();
    context.restore();
  }

  /** Keep a white-hot corona visible after the impact flash without changing the modeled field. */
  private drawSun(context: CanvasRenderingContext2D, center: ScreenPoint, origin: GeoPoint, radii: BlastRadii, reveal: number): void {
    const probe = this.camera.toScreen(destinationPoint(origin, Math.min(radii.fireball, 1), 90));
    const fireballPixels = Math.min(160, Math.hypot(probe.x - center.x, probe.y - center.y) * Math.max(1, radii.fireball));
    const haloRadius = Math.max(38, Math.min(210, fireballPixels * 7));
    const coreRadius = Math.max(8, Math.min(90, fireballPixels * 1.45));
    context.save();
    context.globalAlpha = reveal;
    context.globalCompositeOperation = "screen";
    const halo = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, haloRadius);
    halo.addColorStop(0, "rgba(255,255,255,1)");
    halo.addColorStop(0.12, "rgba(255,252,215,.94)");
    halo.addColorStop(0.36, "rgba(255,217,100,.55)");
    halo.addColorStop(0.72, "rgba(255,115,28,.22)");
    halo.addColorStop(1, "rgba(255,70,16,0)");
    context.fillStyle = halo;
    context.beginPath(); context.arc(center.x, center.y, haloRadius, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "rgba(255,251,215,.36)";
    context.lineWidth = Math.max(1, Math.min(3, coreRadius * 0.11));
    for (let index = 0; index < 8; index++) {
      const angle = index * Math.PI / 4;
      context.beginPath();
      context.moveTo(center.x + Math.cos(angle) * coreRadius * 0.6, center.y + Math.sin(angle) * coreRadius * 0.6);
      context.lineTo(center.x + Math.cos(angle) * haloRadius * 0.58, center.y + Math.sin(angle) * haloRadius * 0.58);
      context.stroke();
    }
    const core = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, coreRadius);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(0.48, "rgba(255,255,249,.99)");
    core.addColorStop(0.82, "rgba(255,244,169,.86)");
    core.addColorStop(1, "rgba(255,171,57,0)");
    context.fillStyle = core;
    context.beginPath(); context.arc(center.x, center.y, coreRadius, 0, Math.PI * 2); context.fill();
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
