import { geoPoint, normalizeLongitude, type GeoPoint } from "../../domain/geodesy";
import type { FlightRoute } from "../../application/launch";
import type { ScreenPoint } from "../map/MapCameraAdapter";

/** Screen-space endpoints for a prototype-style edge-entry flight. Units are CSS pixels. */
export interface ScreenFlightRoute {
  readonly start: ScreenPoint;
  readonly control: ScreenPoint;
}

/**
 * Start 14 CSS pixels inside the viewport edge and bend toward the target.
 * Angle is radians clockwise from the positive screen-x axis.
 */
export function viewportFlightRoute(width: number, height: number, aim: ScreenPoint, angle: number): ScreenFlightRoute {
  if (![width, height, aim.x, aim.y, angle].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new RangeError("Flight viewport, aim, and angle must be finite with positive dimensions.");
  }
  const inset = Math.min(14, width / 4, height / 4);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tx = Math.abs(dx) < 1e-8 ? Infinity : (width / 2 - inset) / Math.abs(dx);
  const ty = Math.abs(dy) < 1e-8 ? Infinity : (height / 2 - inset) / Math.abs(dy);
  const distance = Math.min(tx, ty);
  const start = { x: width / 2 + dx * distance, y: height / 2 + dy * distance };
  const vx = aim.x - start.x;
  const vy = aim.y - start.y;
  const length = Math.max(1, Math.hypot(vx, vy));
  const bend = Math.min(width, height) * 0.07;
  const inside = (value: number, limit: number) => Math.max(inset, Math.min(limit - inset, value));
  return {
    start,
    control: { x: inside((start.x + aim.x) / 2 - vy / length * bend, width), y: inside((start.y + aim.y) / 2 + vx / length * bend, height) },
  };
}

/** Sample a geographic quadratic route at normalized progress, crossing the antimeridian by the short arc. */
export function flightPoint(route: FlightRoute, progress: number): GeoPoint {
  if (!Number.isFinite(progress)) throw new RangeError("Flight progress must be finite.");
  const t = Math.max(0, Math.min(1, progress)) ** 1.16;
  if (t === 0) return route.start;
  if (t === 1) return route.target;
  const startLon = route.start.longitude;
  const controlLon = startLon + normalizeLongitude(route.control.longitude - startLon);
  const targetLon = controlLon + normalizeLongitude(route.target.longitude - controlLon);
  const inverse = 1 - t;
  return geoPoint(
    inverse * inverse * startLon + 2 * inverse * t * controlLon + t * t * targetLon,
    inverse * inverse * route.start.latitude + 2 * inverse * t * route.control.latitude + t * t * route.target.latitude,
  );
}

/** Deterministic smoke offset in CSS pixels and opacity after emission age in seconds. */
export interface SmokeMotion extends ScreenPoint {
  readonly radius: number;
  readonly opacity: number;
}

const noise = (seed: number) => { const value = Math.sin(seed * 12.9898) * 43758.5453; return value - Math.floor(value); };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Keep exhaust near its geographic emission point while it diffuses and fades. */
export function smokeMotion(ageSeconds: number, velocity: ScreenPoint, seed: number): SmokeMotion {
  if (![ageSeconds, velocity.x, velocity.y, seed].every(Number.isFinite) || ageSeconds < 0) throw new RangeError("Smoke inputs must be finite and age nonnegative.");
  const dragTime = 0.22;
  const retained = dragTime * (1 - Math.exp(-ageSeconds / dragTime));
  const diffusion = Math.sqrt(1.6 * ageSeconds);
  const dissipation = clamp((3 - ageSeconds) / 0.6);
  return {
    x: velocity.x * retained * 0.025 + ageSeconds * 0.7 + (noise(seed) - 0.5) * diffusion,
    y: velocity.y * retained * 0.025 - ageSeconds * 0.55 + (noise(seed + 7) - 0.5) * diffusion,
    radius: 0.9 + diffusion,
    opacity: 0.4 * Math.min(1, ageSeconds / 0.08) * Math.exp(-ageSeconds / 1.8) * dissipation * dissipation * (3 - 2 * dissipation),
  };
}
