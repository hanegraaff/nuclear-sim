import { destinationPoint, EARTH_RADIUS_KM, normalizeLongitude, surfaceDistanceKm, type GeoPoint } from "../domain/geodesy";
import type { FlightRoute } from "./launch";

interface Vector {
  readonly eastKm: number;
  readonly northKm: number;
}

// MapLibre limits pitch to 60°; a local affine view then retains at least
// one-half of the unpitched scale along its compressed axis.
const MIN_PROJECTION_AXIS_RATIO = 0.5;

/** A shared geographic carrier route and its millisecond separation time. */
export interface MirvCarrierPlan {
  readonly route: FlightRoute;
  readonly splitMs: number;
}

/** Great-circle displacement expressed on a local east/north kilometer plane. */
function displacement(aim: GeoPoint, point: GeoPoint): Vector {
  const fromLatitude = aim.latitude * Math.PI / 180;
  const toLatitude = point.latitude * Math.PI / 180;
  const longitudeDelta = normalizeLongitude(point.longitude - aim.longitude) * Math.PI / 180;
  const east = Math.sin(longitudeDelta) * Math.cos(toLatitude);
  const north = Math.cos(fromLatitude) * Math.sin(toLatitude)
    - Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta);
  const bearing = Math.atan2(east, north);
  const distanceKm = surfaceDistanceKm(aim, point);
  return { eastKm: distanceKm * Math.sin(bearing), northKm: distanceKm * Math.cos(bearing) };
}

/** Convert a local kilometer displacement back to a valid geographic point. */
function geographicPoint(aim: GeoPoint, vector: Vector): GeoPoint {
  return destinationPoint(aim, Math.hypot(vector.eastKm, vector.northKm), Math.atan2(vector.eastKm, vector.northKm) * 180 / Math.PI);
}

/** The carrier's location and forward derivative at a fraction of its flight. */
function carrierMotion(route: FlightRoute, fraction: number): { point: Vector; tangent: Vector } {
  const aim = route.target;
  const start = displacement(aim, route.start);
  const control = displacement(aim, route.control);
  const eased = fraction ** 1.16;
  const inverse = 1 - eased;
  const speed = 1.16 * fraction ** 0.16;
  return {
    point: {
      eastKm: inverse ** 2 * start.eastKm + 2 * inverse * eased * control.eastKm,
      northKm: inverse ** 2 * start.northKm + 2 * inverse * eased * control.northKm,
    },
    tangent: {
      eastKm: 2 * (inverse * (control.eastKm - start.eastKm) - eased * control.eastKm) * speed,
      northKm: 2 * (inverse * (control.northKm - start.northKm) - eased * control.northKm) * speed,
    },
  };
}

/**
 * Check cubic handles under every rotated affine projection whose shorter
 * axis retains at least 50% scale. The minimum metric dot product has a
 * closed form, so a later 60° camera pitch cannot turn a side target behind
 * the carrier. The 0.82 factor is the prototype's second handle; 0.05 km
 * keeps nearly tangent paths from reversing under rounding.
 */
function branchesAdvance(route: FlightRoute, targets: readonly GeoPoint[], fraction: number, carrierMs: number, lastFlightMs: number): boolean {
  const { point, tangent } = carrierMotion(route, fraction);
  const speed = Math.hypot(tangent.eastKm, tangent.northKm);
  if (speed < 1e-6) return false;
  const splitMs = carrierMs * fraction;
  const firstHandleFactor = (lastFlightMs - splitMs) / carrierMs / 3 / 0.82;
  const shortAxisSquared = MIN_PROJECTION_AXIS_RATIO ** 2;
  return targets.every((target) => {
    const vector = displacement(route.target, target);
    const remaining = {
      eastKm: vector.eastKm - point.eastKm - tangent.eastKm * firstHandleFactor,
      northKm: vector.northKm - point.northKm - tangent.northKm * firstHandleFactor,
    };
    const dot = tangent.eastKm * remaining.eastKm + tangent.northKm * remaining.northKm;
    const worstMetricDot = (1 + shortAxisSquared) * dot / 2
      - (1 - shortAxisSquared) * speed * Math.hypot(remaining.eastKm, remaining.northKm) / 2;
    return worstMetricDot >= speed * 0.05;
  });
}

/**
 * Keep the prototype's 60% split when its geographic spread is ahead. Search
 * earlier carrier positions when needed; if the entry edge lies inside the
 * target spread, extend the stored geographic approach backwards. Targets are
 * never moved, and no screen pixels enter the physical spread calculation.
 */
export function planMirvCarrier(route: FlightRoute, targets: readonly GeoPoint[], carrierMs: number, lastFlightMs: number): MirvCarrierPlan {
  if (targets.length < 2 || !Number.isFinite(carrierMs) || carrierMs <= 0 || !Number.isFinite(lastFlightMs) || lastFlightMs < carrierMs) {
    throw new RangeError("MIRV carrier planning requires targets and positive millisecond flight times.");
  }
  for (let step = 30; step >= 4; step -= 1) {
    const fraction = step / 50;
    if (branchesAdvance(route, targets, fraction, carrierMs, lastFlightMs)) return { route, splitMs: carrierMs * fraction };
  }

  const aim = route.target;
  const start = displacement(aim, route.start);
  const control = displacement(aim, route.control);
  const incoming = Math.hypot(start.eastKm, start.northKm) > 1e-6
    ? { eastKm: -start.eastKm, northKm: -start.northKm }
    : { eastKm: -control.eastKm, northKm: -control.northKm };
  const length = Math.hypot(incoming.eastKm, incoming.northKm);
  const unit = length > 1e-6 ? { eastKm: incoming.eastKm / length, northKm: incoming.northKm / length }
    : { eastKm: 1, northKm: 0 };
  const spreadKm = Math.max(...targets.map((target) => surfaceDistanceKm(aim, target)));
  let retreatKm = Math.max(1, spreadKm);
  for (let attempt = 0; attempt < 16; attempt += 1) {
    // A great-circle endpoint beyond half the circumference is ambiguous.
    if (Math.hypot(start.eastKm - unit.eastKm * retreatKm, start.northKm - unit.northKm * retreatKm) >= Math.PI * EARTH_RADIUS_KM
      || Math.hypot(control.eastKm - unit.eastKm * retreatKm, control.northKm - unit.northKm * retreatKm) >= Math.PI * EARTH_RADIUS_KM) break;
    const extended: FlightRoute = {
      start: geographicPoint(aim, { eastKm: start.eastKm - unit.eastKm * retreatKm, northKm: start.northKm - unit.northKm * retreatKm }),
      control: geographicPoint(aim, { eastKm: control.eastKm - unit.eastKm * retreatKm, northKm: control.northKm - unit.northKm * retreatKm }),
      target: aim,
    };
    if (branchesAdvance(extended, targets, 0.08, carrierMs, lastFlightMs)) return { route: extended, splitMs: carrierMs * 0.08 };
    retreatKm *= 2;
  }
  // At an almost antipodal/degenerate input, preserve the incoming bearing but
  // replace the ill-defined long arc with a bounded approach around the aim.
  const approachKm = Math.max(2, Math.min(8_000, spreadKm * 4));
  const fallback: FlightRoute = {
    start: geographicPoint(aim, { eastKm: -unit.eastKm * approachKm, northKm: -unit.northKm * approachKm }),
    control: geographicPoint(aim, { eastKm: -unit.eastKm * approachKm / 2, northKm: -unit.northKm * approachKm / 2 }),
    target: aim,
  };
  if (branchesAdvance(fallback, targets, 0.08, carrierMs, lastFlightMs)) return { route: fallback, splitMs: carrierMs * 0.08 };
  throw new RangeError("Unable to plan forward MIRV branches for this geographic target spread.");
}
