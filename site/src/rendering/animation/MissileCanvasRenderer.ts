import type { Launch, LaunchFrame } from "../../application/launch";
import type { ScreenPoint } from "../map/MapCameraAdapter";
import { projectFlightRoute, screenFlightPoint, screenMirvPoint, smokeParticle, SMOKE_SAMPLE_STEP_MS, type FlightProjector, type ProjectedFlightRoute, type ProjectedMirvRoute } from "./flightGeometry";

/** Draws the prototype target, smoke, and white-hot carrier on a transparent canvas. */
export class MissileCanvasRenderer {
  private smokeSprite: HTMLCanvasElement | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly projector: FlightProjector) {}

  /** Clear and repaint at CSS-pixel dimensions; the launch route remains geographic. */
  render(launch: Launch | null, elapsedMs: number, width: number, height: number): void {
    this.renderMany(launch ? [{ launch, elapsedMs }] : [], width, height);
  }

  /** Paint every live carrier and its bounded recent smoke on one canvas. */
  renderMany(frames: readonly LaunchFrame[], width: number, height: number): void {
    const pixelRatio = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
    const pixelHeight = Math.max(1, Math.round(height * pixelRatio));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    const context = this.canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    const smokeStep = frames.length >= 10 ? 3 : frames.length >= 5 ? 2 : 1;
    for (const { launch, elapsedMs } of frames) {
      if (elapsedMs >= launch.flightMs + 3000) continue;
      if (launch.mirv) {
        this.drawMirvFlight(context, launch, elapsedMs, smokeStep);
        continue;
      }
      const route = projectFlightRoute(launch.route, this.projector);
      if (elapsedMs < launch.flightMs) this.drawTarget(context, route.target, elapsedMs);
      this.drawSmoke(context, launch, route, elapsedMs, smokeStep);
      if (elapsedMs < launch.flightMs) this.drawCore(context, screenFlightPoint(route, elapsedMs / launch.flightMs));
    }
  }

  /** Draw a temporary geographic target while an unsafe MIRV camera is framed. */
  paintPendingTarget(target: import("../../domain/geodesy").GeoPoint): void {
    const context = this.canvas.getContext("2d");
    if (context) this.drawTarget(context, this.projector.toScreen(target), 0);
  }

  /** Paint one shared carrier before split and geographically distinct branches afterwards. */
  private drawMirvFlight(context: CanvasRenderingContext2D, launch: Launch, elapsedMs: number, smokeStep: number): void {
    const mirv = launch.mirv!;
    const carrier = projectFlightRoute(mirv.route, this.projector);
    const route: ProjectedMirvRoute = {
      carrier,
      target: this.projector.toScreen(launch.route.target),
      splitMs: mirv.splitMs,
      carrierFlightMs: mirv.carrierFlightMs,
      flightMs: launch.flightMs,
    };
    if (mirv.lead) {
      if (elapsedMs < mirv.splitMs) this.drawTarget(context, carrier.target, elapsedMs);
      this.drawSmoke(context, launch, carrier, elapsedMs, smokeStep, 0, mirv.splitMs,
        (timeMs) => screenFlightPoint(carrier, timeMs / mirv.carrierFlightMs));
    }
    if (elapsedMs < mirv.splitMs) {
      if (mirv.lead) this.drawCore(context, screenFlightPoint(carrier, elapsedMs / mirv.carrierFlightMs));
      return;
    }
    if (elapsedMs < launch.flightMs) this.drawTarget(context, route.target, elapsedMs);
    this.drawSmoke(context, launch, carrier, elapsedMs, smokeStep, mirv.splitMs, launch.flightMs,
      (timeMs) => screenMirvPoint(route, timeMs), 0.7);
    if (elapsedMs < launch.flightMs) this.drawCore(context, screenMirvPoint(route, elapsedMs), 8, 1);
  }

  private drawTarget(context: CanvasRenderingContext2D, point: ScreenPoint, elapsedMs: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(elapsedMs / 180);
    const radius = 7.5 + pulse * 1.35;
    const gap = radius + 3.5;
    const arm = gap + 4.5;
    context.save();
    context.translate(point.x, point.y);
    context.fillStyle = "rgba(12, 4, 5, .48)";
    context.beginPath();
    context.arc(0, 0, radius + 3.2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = `rgba(255, 58, 65, ${0.82 + pulse * 0.16})`;
    context.lineWidth = 1.35;
    context.shadowColor = "rgba(255, 22, 35, .72)";
    context.shadowBlur = 5 + pulse * 3;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.moveTo(-arm, 0); context.lineTo(-gap, 0);
    context.moveTo(gap, 0); context.lineTo(arm, 0);
    context.moveTo(0, -arm); context.lineTo(0, -gap);
    context.moveTo(0, gap); context.lineTo(0, arm);
    context.stroke();
    context.shadowBlur = 7;
    context.fillStyle = "rgba(255, 93, 98, .96)";
    context.beginPath();
    context.arc(0, 0, 1.65, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  private drawSmoke(context: CanvasRenderingContext2D, launch: Launch, route: ProjectedFlightRoute, elapsedMs: number, sampleStep = 1,
    firstBornMs = 0, lastBornMs = launch.flightMs, pointAtMs?: (timeMs: number) => ScreenPoint, opacityScale = 1): void {
    const stepMs = SMOKE_SAMPLE_STEP_MS * sampleStep;
    const startMs = Math.max(firstBornMs, Math.ceil((elapsedMs - 3000) / stepMs) * stepMs);
    context.save();
    context.lineCap = "round";
    for (let bornMs = startMs; bornMs < Math.min(elapsedMs, lastBornMs); bornMs += stepMs) {
      const particle = smokeParticle(route, bornMs, elapsedMs, lastBornMs, launch.id * 193, pointAtMs);
      const opacity = particle.opacity * opacityScale;
      if (opacity < 0.008) continue;
      const { x, y } = particle.center;
      if (particle.segmentEnd) {
        context.globalAlpha = opacity * 0.28;
        context.strokeStyle = "rgb(18,25,23)";
        context.lineWidth = 1.9;
        context.beginPath(); context.moveTo(x, y); context.lineTo(particle.segmentEnd.x, particle.segmentEnd.y); context.stroke();
        context.globalAlpha = opacity;
        context.strokeStyle = "rgb(235,239,230)";
        context.lineWidth = 0.9;
        context.stroke();
      }
      if (Math.round(bornMs / stepMs) % 3 === 0) {
        context.globalAlpha = opacity * 0.3;
        const size = particle.radius * 2;
        context.drawImage(this.getSmokeSprite(), x - particle.radius, y - particle.radius, size, size);
      }
    }
    context.restore();
  }

  private drawCore(context: CanvasRenderingContext2D, point: ScreenPoint, radius = 12, coreRadius = 1.45): void {
    context.save();
    context.globalCompositeOperation = "screen";
    const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    glow.addColorStop(0, "rgba(255,255,250,1)");
    glow.addColorStop(0.12, "rgba(255,250,213,1)");
    glow.addColorStop(0.32, "rgba(255,188,73,.8)");
    glow.addColorStop(0.65, "rgba(255,82,25,.22)");
    glow.addColorStop(1, "rgba(190,33,0,0)");
    context.fillStyle = glow;
    context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#fffef2";
    context.beginPath(); context.arc(point.x, point.y, coreRadius, 0, Math.PI * 2); context.fill();
    context.restore();
  }

  private getSmokeSprite(): HTMLCanvasElement {
    if (this.smokeSprite) return this.smokeSprite;
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const context = sprite.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(235,239,230,.96)");
      gradient.addColorStop(0.35, "rgba(235,239,230,.78)");
      gradient.addColorStop(0.72, "rgba(235,239,230,.2)");
      gradient.addColorStop(1, "rgba(235,239,230,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    this.smokeSprite = sprite;
    return sprite;
  }
}
