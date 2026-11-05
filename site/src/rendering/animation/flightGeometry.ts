import type { GeoPoint } from "../../domain/geodesy";
import type { FlightRoute } from "../../application/launch";
import type { ScreenPoint } from "../map/MapCameraAdapter";

/** Screen-space endpoints for a prototype-style edge-entry flight. Units are CSS pixels. */
export interface ScreenFlightRoute {
  readonly start: ScreenPoint;
  readonly control: ScreenPoint;
}

/** Projected carrier route in CSS pixels for one camera frame. */
export interface ProjectedFlightRoute extends ScreenFlightRoute {
  readonly target: ScreenPoint;
}

/** Geographic-to-screen projection supplied by the map adapter. */
export interface FlightProjector {
  toScreen(point: GeoPoint): ScreenPoint;
}

/**
 * Start 14 CSS pixels inside the viewport edge and bend toward the target.
 * When a selected MIRV needs runway near that edge, slide entry along the
 * same edge. Single-device paths retain the prototype's fixed edge bearing.
 * Angle is radians clockwise from the positive screen-x axis.
 */
export function viewportFlightRoute(width: number, height: number, aim: ScreenPoint, angle: number, ensureMirvRunway = false): ScreenFlightRoute {
  if (![width, height, aim.x, aim.y, angle].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new RangeError("Flight viewport, aim, and angle must be finite with positive dimensions.");
  }
  const inset = Math.min(14, width / 4, height / 4);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tx = Math.abs(dx) < 1e-8 ? Infinity : (width / 2 - inset) / Math.abs(dx);
  const ty = Math.abs(dy) < 1e-8 ? Infinity : (height / 2 - inset) / Math.abs(dy);
  const distance = Math.min(tx, ty);
  const initial = { x: width / 2 + dx * distance, y: height / 2 + dy * distance };
  const runway = Math.min(width, height) * 0.4;
  const span = Math.hypot(aim.x - initial.x, aim.y - initial.y);
  let start = initial;
  if (ensureMirvRunway && span < runway) {
    const onVerticalEdge = Math.abs(initial.x - inset) < 1e-6 || Math.abs(initial.x - (width - inset)) < 1e-6;
    const extent = onVerticalEdge ? height : width;
    const candidates = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
      const position = inset + (extent - inset * 2) * fraction;
      return onVerticalEdge ? { x: initial.x, y: position } : { x: position, y: initial.y };
    });
    start = candidates.filter((candidate) => Math.hypot(aim.x - candidate.x, aim.y - candidate.y) >= runway)
      .sort((a, b) => Math.hypot(a.x - initial.x, a.y - initial.y) - Math.hypot(b.x - initial.x, b.y - initial.y))[0] ?? initial;
  }
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

/** Project the stored geographic route through the current camera once per frame. */
export function projectFlightRoute(route: FlightRoute, projector: FlightProjector): ProjectedFlightRoute {
  return {
    start: projector.toScreen(route.start),
    control: projector.toScreen(route.control),
    target: projector.toScreen(route.target),
  };
}

/** Sample the prototype's eased quadratic curve in projected CSS pixels. */
export function screenFlightPoint(route: ProjectedFlightRoute, progress: number): ScreenPoint {
  if (!Number.isFinite(progress)) throw new RangeError("Flight progress must be finite.");
  const t = Math.max(0, Math.min(1, progress)) ** 1.16;
  if (t === 0) return route.start;
  if (t === 1) return route.target;
  const inverse = 1 - t;
  return {
    x: inverse * inverse * route.start.x + 2 * inverse * t * route.control.x + t * t * route.target.x,
    y: inverse * inverse * route.start.y + 2 * inverse * t * route.control.y + t * t * route.target.y,
  };
}

/** Shared carrier and one reentry vehicle projected to CSS pixels, with millisecond timing. */
export interface ProjectedMirvRoute {
  readonly carrier: ProjectedFlightRoute;
  readonly target: ScreenPoint;
  readonly splitMs: number;
  readonly carrierFlightMs: number;
  readonly flightMs: number;
}

/**
 * Follow the carrier until separation, then use a cubic branch whose starting
 * derivative matches the eased carrier's CSS-pixel velocity. Camera projection
 * is applied before sampling, so every frame uses the same map transform.
 */
export function screenMirvPoint(route: ProjectedMirvRoute, elapsedMs: number): ScreenPoint {
  if (!Number.isFinite(elapsedMs) || route.splitMs <= 0 || route.carrierFlightMs <= route.splitMs || route.flightMs <= route.splitMs) {
    throw new RangeError("MIRV flight requires a finite age and a split within both flight durations.");
  }
  const splitProgress = route.splitMs / route.carrierFlightMs;
  if (elapsedMs <= route.splitMs) return screenFlightPoint(route.carrier, elapsedMs / route.carrierFlightMs);
  const start = screenFlightPoint(route.carrier, splitProgress);
  const eased = splitProgress ** 1.16;
  const tangentScale = 1.16 * splitProgress ** 0.16 * (route.flightMs - route.splitMs) / route.carrierFlightMs;
  const tangent = {
    x: 2 * ((1 - eased) * (route.carrier.control.x - route.carrier.start.x) + eased * (route.carrier.target.x - route.carrier.control.x)) * tangentScale,
    y: 2 * ((1 - eased) * (route.carrier.control.y - route.carrier.start.y) + eased * (route.carrier.target.y - route.carrier.control.y)) * tangentScale,
  };
  const control = { x: start.x + tangent.x / 3, y: start.y + tangent.y / 3 };
  // The prototype's second handle keeps each vehicle moving through impact
  // instead of easing to a complete stop at the target.
  const approach = {
    x: route.target.x - (route.target.x - start.x) * 0.18,
    y: route.target.y - (route.target.y - start.y) * 0.18,
  };
  const u = Math.max(0, Math.min(1, (elapsedMs - route.splitMs) / (route.flightMs - route.splitMs)));
  const inverse = 1 - u;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * u * control.x + 3 * inverse * u ** 2 * approach.x + u ** 3 * route.target.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * u * control.y + 3 * inverse * u ** 2 * approach.y + u ** 3 * route.target.y,
  };
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

/** One exhaust sample and its younger adjacent endpoint in CSS pixels. */
export interface SmokeParticle {
  readonly center: ScreenPoint;
  readonly segmentEnd: ScreenPoint | null;
  readonly radius: number;
  readonly opacity: number;
}

/** Milliseconds between smoke emissions, matching the prototype's normal draw budget. */
export const SMOKE_SAMPLE_STEP_MS = 60;

/** Sample fixed-age smoke without using the previous puff's drift for the segment end. */
export function smokeParticle(route: ProjectedFlightRoute, bornMs: number, elapsedMs: number, flightMs: number, seed: number, pointAtMs: (timeMs: number) => ScreenPoint = (timeMs) => screenFlightPoint(route, timeMs / flightMs)): SmokeParticle {
  const from = pointAtMs(bornMs);
  const after = pointAtMs(Math.min(flightMs, bornMs + 20));
  const velocity = { x: (after.x - from.x) * 50, y: (after.y - from.y) * 50 };
  const motion = smokeMotion((elapsedMs - bornMs) / 1000, velocity, seed + bornMs);
  const nextMs = Math.min(elapsedMs - 70, flightMs, bornMs + SMOKE_SAMPLE_STEP_MS);
  let segmentEnd: ScreenPoint | null = null;
  if (nextMs > bornMs) {
    const next = pointAtMs(nextMs);
    const nextMotion = smokeMotion((elapsedMs - nextMs) / 1000, velocity, seed + nextMs);
    segmentEnd = { x: next.x + nextMotion.x, y: next.y + nextMotion.y };
  }
  return {
    center: { x: from.x + motion.x, y: from.y + motion.y },
    segmentEnd,
    radius: motion.radius,
    opacity: motion.opacity,
  };
}
