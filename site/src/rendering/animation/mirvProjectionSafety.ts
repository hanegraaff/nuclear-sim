import type { FlightRoute } from "../../application/launch";
import { planMirvCarrier, type MirvCarrierPlan } from "../../application/mirvCarrierPlan";
import type { GeoPoint } from "../../domain/geodesy";
import { projectFlightRoute, screenFlightPoint, screenMirvPoint, type FlightProjector } from "./flightGeometry";

/** Geographic carrier plan checked against the camera projection at launch. */
export interface ProjectedMirvPlan {
  readonly plan: MirvCarrierPlan;
  readonly safe: boolean;
}

/**
 * The geographic planner constrains east/north motion. This rendering check
 * samples the actual projected cubic so pitch and bearing cannot hide a
 * screen-space reversal at separation. Tolerances are CSS pixels.
 */
export function projectedMirvPlan(route: FlightRoute, targets: readonly GeoPoint[], projector: FlightProjector,
  carrierMs: number, staggerMs: number, width: number, height: number): ProjectedMirvPlan {
  const plan = planMirvCarrier(route, targets, carrierMs, carrierMs + (targets.length - 1) * staggerMs);
  const carrier = projectFlightRoute(plan.route, projector);
  if (carrier.start.x < 8 || carrier.start.x > width - 8 || carrier.start.y < 8 || carrier.start.y > height - 8) {
    return { plan, safe: false };
  }
  const fraction = plan.splitMs / carrierMs;
  const split = screenFlightPoint(carrier, fraction);
  const next = screenFlightPoint(carrier, Math.min(1, fraction + 0.0001));
  const vx = next.x - split.x;
  const vy = next.y - split.y;
  const speed = Math.hypot(vx, vy);
  if (speed < 1e-6) return { plan, safe: false };
  for (const [index, target] of targets.entries()) {
    const flightMs = carrierMs + index * staggerMs;
    const branch = { carrier, target: projector.toScreen(target), splitMs: plan.splitMs, carrierFlightMs: carrierMs, flightMs };
    let previous = -0.1;
    for (let step = 0; step <= 20; step += 1) {
      const point = screenMirvPoint(branch, plan.splitMs + (flightMs - plan.splitMs) * step / 20);
      const along = ((point.x - split.x) * vx + (point.y - split.y) * vy) / speed;
      if (along < previous - 0.1) return { plan, safe: false };
      previous = along;
    }
    if (previous < 2) return { plan, safe: false };
  }
  return { plan, safe: true };
}
