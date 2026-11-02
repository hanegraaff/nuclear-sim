import type { Launch } from "../../application/launch";
import type { ScreenPoint } from "../map/MapCameraAdapter";
import { projectFlightRoute, screenFlightPoint, smokeParticle, SMOKE_SAMPLE_STEP_MS, type FlightProjector, type ProjectedFlightRoute } from "./flightGeometry";

/** Draws the prototype target, smoke, and white-hot carrier on a transparent canvas. */
export class MissileCanvasRenderer {
  private smokeSprite: HTMLCanvasElement | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly projector: FlightProjector) {}

  /** Clear and repaint at CSS-pixel dimensions; the launch route remains geographic. */
  render(launch: Launch | null, elapsedMs: number, width: number, height: number): void {
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
    if (!launch) return;
    const route = projectFlightRoute(launch.route, this.projector);
    this.drawTarget(context, route.target, elapsedMs);
    this.drawSmoke(context, launch, route, elapsedMs);
    if (elapsedMs < launch.flightMs) this.drawCore(context, screenFlightPoint(route, elapsedMs / launch.flightMs));
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

  private drawSmoke(context: CanvasRenderingContext2D, launch: Launch, route: ProjectedFlightRoute, elapsedMs: number): void {
    const stepMs = SMOKE_SAMPLE_STEP_MS;
    const startMs = Math.max(0, Math.ceil((elapsedMs - 3000) / stepMs) * stepMs);
    context.save();
    context.lineCap = "round";
    for (let bornMs = startMs; bornMs < Math.min(elapsedMs, launch.flightMs); bornMs += stepMs) {
      const particle = smokeParticle(route, bornMs, elapsedMs, launch.flightMs, launch.id * 193);
      if (particle.opacity < 0.008) continue;
      const { x, y } = particle.center;
      if (particle.segmentEnd) {
        context.globalAlpha = particle.opacity * 0.28;
        context.strokeStyle = "rgb(18,25,23)";
        context.lineWidth = 1.9;
        context.beginPath(); context.moveTo(x, y); context.lineTo(particle.segmentEnd.x, particle.segmentEnd.y); context.stroke();
        context.globalAlpha = particle.opacity;
        context.strokeStyle = "rgb(235,239,230)";
        context.lineWidth = 0.9;
        context.stroke();
      }
      if (Math.round(bornMs / stepMs) % 3 === 0) {
        context.globalAlpha = particle.opacity * 0.3;
        const size = particle.radius * 2;
        context.drawImage(this.getSmokeSprite(), x - particle.radius, y - particle.radius, size, size);
      }
    }
    context.restore();
  }

  private drawCore(context: CanvasRenderingContext2D, point: ScreenPoint): void {
    context.save();
    context.globalCompositeOperation = "screen";
    const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 12);
    glow.addColorStop(0, "rgba(255,255,250,1)");
    glow.addColorStop(0.12, "rgba(255,250,213,1)");
    glow.addColorStop(0.32, "rgba(255,188,73,.8)");
    glow.addColorStop(0.65, "rgba(255,82,25,.22)");
    glow.addColorStop(1, "rgba(190,33,0,0)");
    context.fillStyle = glow;
    context.beginPath(); context.arc(point.x, point.y, 12, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#fffef2";
    context.beginPath(); context.arc(point.x, point.y, 1.45, 0, Math.PI * 2); context.fill();
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
