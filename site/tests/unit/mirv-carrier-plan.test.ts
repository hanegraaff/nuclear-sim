/** Geographic carrier planning tests use kilometer-scale fixtures and inspect the rendered branch direction. */
import { describe, expect, it } from "vitest";
import { planMirvCarrier } from "../../src/application/mirvCarrierPlan";
import type { FlightRoute } from "../../src/application/launch";
import { geoPoint, normalizeLongitude, surfaceDistanceKm, type GeoPoint } from "../../src/domain/geodesy";
import { screenFlightPoint, screenMirvPoint } from "../../src/rendering/animation/flightGeometry";

const CARRIER_MS = 6500;

/** Linear local projection is sufficient to expose backward screen motion over this small fixture. */
function assertEveryBranchAdvances(route: FlightRoute, targets: readonly GeoPoint[]): void {
  const plan = planMirvCarrier(route, targets, CARRIER_MS, CARRIER_MS + (targets.length - 1) * 45);
  const toScreen = (point: GeoPoint) => ({
    x: normalizeLongitude(point.longitude - route.target.longitude) * 111 * Math.cos(route.target.latitude * Math.PI / 180),
    y: (point.latitude - route.target.latitude) * 111,
  });
  const carrier = { start: toScreen(plan.route.start), control: toScreen(plan.route.control), target: toScreen(plan.route.target) };
  const splitFraction = plan.splitMs / CARRIER_MS;
  const split = screenFlightPoint(carrier, splitFraction);
  const shortlyAfter = screenFlightPoint(carrier, splitFraction + 0.0001);
  const direction = { x: shortlyAfter.x - split.x, y: shortlyAfter.y - split.y };
  const length = Math.hypot(direction.x, direction.y);
  expect(length).toBeGreaterThan(0);
  for (const [index, target] of targets.entries()) {
    const flightMs = CARRIER_MS + index * 45;
    const branch = { carrier, target: toScreen(target), splitMs: plan.splitMs, carrierFlightMs: CARRIER_MS, flightMs };
    const positions = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map((fraction) => screenMirvPoint(branch, plan.splitMs + (flightMs - plan.splitMs) * fraction));
    const along = positions.map((point) => ((point.x - split.x) * direction.x + (point.y - split.y) * direction.y) / length);
    // 0.01 km accepts the local linear-projection error; the old path visibly
    // reversed by multiple kilometers when a target lay behind the split.
    for (let sample = 1; sample < along.length; sample += 1) expect(along[sample]!).toBeGreaterThan(along[sample - 1]! + 0.01);
    expect(surfaceDistanceKm(plan.route.target, target)).toBeGreaterThan(0);
  }
}

describe("forward-facing geographic MIRV carrier", () => {
  it("keeps the prototype 60 percent split when all targets are ahead", () => {
    const route = { start: geoPoint(-2, 0), control: geoPoint(-1, 0), target: geoPoint(0, 0) };
    const targets = [geoPoint(-0.08, 0.04), geoPoint(0.06, -0.04), geoPoint(0.02, 0.08)];
    expect(planMirvCarrier(route, targets, CARRIER_MS, CARRIER_MS + 90)).toMatchObject({ route, splitMs: 3900 });
    assertEveryBranchAdvances(route, targets);
  });

  it("extends an entry route when nearby targets lie behind every visible split point", () => {
    const route = { start: geoPoint(-0.02, 0), control: geoPoint(-0.01, 0), target: geoPoint(0, 0) };
    const targets = [geoPoint(-0.15, 0.01), geoPoint(0.1, 0.03), geoPoint(0.02, -0.11)];
    const plan = planMirvCarrier(route, targets, CARRIER_MS, CARRIER_MS + 90);
    expect(plan.route.start).not.toEqual(route.start);
    expect(plan.splitMs).toBeLessThan(3900);
    assertEveryBranchAdvances(route, targets);
  });

  it("keeps branch motion forward for a curved carrier beside an antimeridian target", () => {
    const route = { start: geoPoint(179.82, 20), control: geoPoint(179.9, 20.04), target: geoPoint(-179.98, 20.02) };
    const targets = [geoPoint(179.88, 20.01), geoPoint(-179.85, 20.07), geoPoint(-179.92, 19.96)];
    const plan = planMirvCarrier(route, targets, CARRIER_MS, CARRIER_MS + 90);
    expect(plan.route.start.longitude).toBeGreaterThanOrEqual(-180);
    expect(plan.route.start.longitude).toBeLessThan(180);
    assertEveryBranchAdvances(route, targets);
  });

  it.each([
    {
      name: "north polar approach",
      route: { start: geoPoint(44.7, 84.7), control: geoPoint(44.85, 84.83), target: geoPoint(45, 84.9) },
      targets: [geoPoint(44.4, 84.91), geoPoint(45.5, 84.88), geoPoint(45.1, 84.94)],
    },
    {
      name: "south polar antimeridian approach",
      route: { start: geoPoint(179.7, -84.7), control: geoPoint(179.85, -84.82), target: geoPoint(-179.98, -84.9) },
      targets: [geoPoint(179.4, -84.91), geoPoint(-179.5, -84.88), geoPoint(-179.9, -84.94)],
    },
  ])("plans a finite forward branch for a $name", ({ route, targets }) => {
    const plan = planMirvCarrier(route, targets, CARRIER_MS, CARRIER_MS + 90);
    expect(plan.splitMs).toBeGreaterThan(0);
    expect(surfaceDistanceKm(plan.route.start, route.target)).toBeLessThan(10_000);
    assertEveryBranchAdvances(route, targets);
  });

  it("replaces an almost antipodal entry arc with a bounded forward approach", () => {
    const route = { start: geoPoint(0, 0), control: geoPoint(-179.99, 0.01), target: geoPoint(0, 0) };
    const targets = [geoPoint(-0.08, 0.04), geoPoint(0.06, -0.04), geoPoint(0.02, 0.08)];
    const plan = planMirvCarrier(route, targets, CARRIER_MS, CARRIER_MS + 90);
    expect(surfaceDistanceKm(plan.route.start, route.target)).toBeLessThan(100);
    assertEveryBranchAdvances(route, targets);
  });
});
