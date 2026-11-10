import type { Launch } from "../../application/launch";
import type { BlastRadii } from "../../domain/blast";
import { destinationPoint, type GeoPoint } from "../../domain/geodesy";
import type { MapCameraAdapter, ScreenPoint } from "../map/MapCameraAdapter";
import type { BlastDistanceGrid } from "./blastFieldGeometry";
import { groundGlowColor } from "./groundGlow";
import { blastExpansion } from "../animation/blastTiming";
const FLASH_MS = 1100;

/** Lazy geographic light samples in km and viewport dimensions in CSS pixels; only the bounded raster survives cache construction. */
export interface OpticalGroundField {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  sample(): BlastDistanceGrid | null;
}

/** Shared single-reference corona, flash and shock ring with at most eight cached ground-light rasters. */
export class BlastOpticalEffects {
  private readonly groundSuns = new Map<string, HTMLCanvasElement>();
  private activeKey = "";
  constructor(private readonly camera: MapCameraAdapter) {}

  /** Forget projected light rasters after a camera or viewport change. */
  invalidateProjection(): void { this.groundSuns.clear(); }

  /** Paint optical decoration at an immutable launch age in ms and CSS viewport dimensions. */
  paint(context: CanvasRenderingContext2D, launch: Launch, elapsedMs: number, width: number, height: number, field: OpticalGroundField | null): void {
    const age = elapsedMs - launch.flightMs;
    if (age < 0) return;
    const center = this.camera.toScreen(launch.route.target);
    if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return;
    this.activeKey = `${launch.id}:${width}:${height}`;
    const progress = Math.min(1, age / launch.blastMs);
    const travelledKm = launch.radii.light * blastExpansion(progress);
    if (travelledKm > 0) this.drawOpticalSun(context, center, launch.route.target, launch.radii, Math.min(1, age / 650), field);
    if (!launch.reducedMotion && progress > 0 && progress < 1) this.drawShockwave(context, launch.route.target, travelledKm);
    if (!launch.reducedMotion && age < FLASH_MS) this.drawFlash(context, center, age, Math.min(width, height));
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

  /** Keep top-down light unchanged; sample its glow on geographic ground in pitched views. */
  private drawOpticalSun(context: CanvasRenderingContext2D, center: ScreenPoint, origin: GeoPoint, radii: BlastRadii, reveal: number, field: OpticalGroundField | null): void {
    if (this.camera.snapshot().pitch > 0.01 && field && this.drawGroundSun(context, center, origin, radii, reveal, field)) return;
    this.drawSun(context, center, origin, radii, reveal);
  }

  /** Rasterize light from the same geodesic distance grid as the damage field. */
  private drawGroundSun(context: CanvasRenderingContext2D, center: ScreenPoint, origin: GeoPoint, radii: BlastRadii, reveal: number, field: OpticalGroundField): boolean {
    let groundSunCanvas = this.groundSuns.get(this.activeKey);
    if (!groundSunCanvas) {
      const grid = field.sample();
      if (!grid) return false;
      let shortProbe: ScreenPoint;
      let kilometerProbe: ScreenPoint;
      try {
        shortProbe = this.camera.toScreen(destinationPoint(origin, Math.min(radii.fireball, 1), 90));
        kilometerProbe = this.camera.toScreen(destinationPoint(origin, 1, 90));
      } catch {
        return false;
      }
      const pixelsPerKm = Math.hypot(kilometerProbe.x - center.x, kilometerProbe.y - center.y);
      if (!Number.isFinite(pixelsPerKm) || pixelsPerKm < 0.001) return false;
      const fireballPixels = Math.min(160, Math.hypot(shortProbe.x - center.x, shortProbe.y - center.y) * Math.max(1, radii.fireball));
      const haloKm = Math.max(38, Math.min(210, fireballPixels * 7)) / pixelsPerKm;
      const coreKm = Math.max(8, Math.min(90, fireballPixels * 1.45)) / pixelsPerKm;
      const canvas = document.createElement("canvas");
      canvas.width = grid.width;
      canvas.height = grid.height;
      const target = canvas.getContext("2d");
      if (!target) return false;
      const image = target.createImageData(canvas.width, canvas.height);
      for (let index = 0; index < grid.distancesKm.length; index++) {
        const glow = groundGlowColor(grid.distancesKm[index]!, coreKm, haloKm);
        const offset = index * 4;
        image.data[offset] = glow.red;
        image.data[offset + 1] = glow.green;
        image.data[offset + 2] = glow.blue;
        image.data[offset + 3] = Math.round(glow.alpha * 255);
      }
      target.putImageData(image, 0, 0);
      groundSunCanvas = canvas;
      this.groundSuns.set(this.activeKey, canvas);
      while (this.groundSuns.size > 8) this.groundSuns.delete(this.groundSuns.keys().next().value!);
    }
    context.save();
    context.globalAlpha = reveal;
    context.globalCompositeOperation = "screen";
    context.imageSmoothingEnabled = true;
    context.drawImage(groundSunCanvas, 0, 0, field.viewportWidth, field.viewportHeight);
    context.restore();
    return true;
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
