/** Prototype flight geometry tests cover edge entry, projected continuity, and smoke age. */
import { describe, expect, it } from "vitest";
import { projectFlightRoute, screenFlightPoint, smokeMotion, smokeParticle, viewportFlightRoute } from "../../src/rendering/animation/flightGeometry";

describe("prototype carrier trajectory", () => {
  it("starts 14 pixels inside a viewport edge for representative screen sizes and angles", () => {
    for (const [width, height] of [[1440, 900], [390, 844], [800, 500]] as const) {
      for (const angle of [0, Math.PI / 3, Math.PI, 5 * Math.PI / 3]) {
        const { start, control } = viewportFlightRoute(width, height, { x: width * 0.8, y: height * 0.65 }, angle);
        const distance = Math.min(start.x, width - start.x, start.y, height - start.y);
        expect(distance).toBeCloseTo(14, 6);
        expect(control.x).toBeGreaterThan(0);
        expect(control.x).toBeLessThan(width);
        expect(control.y).toBeGreaterThan(0);
        expect(control.y).toBeLessThan(height);
      }
    }
  });

  it("uses one edge entry with the same bearing while separate targets keep their own curves", () => {
    const first = viewportFlightRoute(1508, 1080, { x: 920, y: 570 }, -Math.PI / 4);
    const second = viewportFlightRoute(1508, 1080, { x: 1080, y: 630 }, -Math.PI / 4);
    expect(first.start).toEqual(second.start);
    expect(first.control).not.toEqual(second.control);
    expect(screenFlightPoint({ ...first, target: { x: 920, y: 570 } }, 1)).toEqual({ x: 920, y: 570 });
    expect(screenFlightPoint({ ...second, target: { x: 1080, y: 630 } }, 1)).toEqual({ x: 1080, y: 630 });
  });

  it("moves an edge-adjacent entry along its edge to keep the carrier visible from launch", () => {
    const aim = { x: 1430, y: 100 };
    const normal = viewportFlightRoute(1508, 1080, aim, -Math.PI / 4);
    const route = viewportFlightRoute(1508, 1080, aim, -Math.PI / 4, true);
    expect(route.start.y).toBeCloseTo(14, 6);
    expect(Math.hypot(aim.x - route.start.x, aim.y - route.start.y)).toBeGreaterThanOrEqual(432);
    expect(route.start.x).toBeGreaterThan(14);
    expect(normal.start).not.toEqual(route.start);
    expect(Math.hypot(aim.x - normal.start.x, aim.y - normal.start.y)).toBeLessThan(432);
    const nextGroup = viewportFlightRoute(1508, 1080, { x: 1380, y: 70 }, -Math.PI / 4, true);
    expect(nextGroup.start.y).toBeCloseTo(route.start.y, 6);
  });

  it("arrives exactly at the target without a position jump", () => {
    const route = { start: { x: 0, y: 0 }, control: { x: 400, y: 80 }, target: { x: 700, y: 450 } };
    expect(screenFlightPoint(route, 0)).toEqual(route.start);
    expect(screenFlightPoint(route, 1)).toEqual(route.target);
    for (let step = 1; step <= 100; step++) {
      const previous = screenFlightPoint(route, (step - 1) / 100);
      const current = screenFlightPoint(route, step / 100);
      expect(Math.hypot(current.x - previous.x, current.y - previous.y)).toBeLessThan(14);
    }
  });

  it("projects control points before curving under a nonlinear camera", () => {
    const route = { start: { longitude: 1, latitude: 1 }, control: { longitude: 2, latitude: 2 }, target: { longitude: 3, latitude: 3 } };
    const projector = { toScreen: (point: { longitude: number; latitude: number }) => ({ x: point.longitude * 10, y: point.latitude ** 2 * 10 }) };
    const projected = projectFlightRoute(route, projector);
    const midpoint = screenFlightPoint(projected, 0.5);
    const eased = 0.5 ** 1.16;
    const expectedY = (1 - eased) ** 2 * 10 + 2 * (1 - eased) * eased * 40 + eased ** 2 * 90;
    expect(midpoint.y).toBeCloseTo(expectedY, 10);
    expect(midpoint.y).not.toBeCloseTo((1 + 2 * eased) ** 2 * 10, 1);
  });
});

describe("exhaust dispersion", () => {
  it("stays near its emission point, expands, fades, and vanishes at three seconds", () => {
    const fresh = smokeMotion(0.2, { x: 200, y: 0 }, 12);
    const old = smokeMotion(2.5, { x: 200, y: 0 }, 12);
    expect(old.radius).toBeGreaterThan(fresh.radius);
    expect(old.opacity).toBeLessThan(fresh.opacity);
    expect(Math.abs(old.x)).toBeLessThan(10);
    expect(smokeMotion(3, { x: 200, y: 0 }, 12).opacity).toBe(0);
    expect(smokeMotion(0.2, { x: 200, y: 0 }, 12)).toEqual(fresh);
  });

  it("uses the next puff's younger age and seed at the smoke segment endpoint", () => {
    const route = { start: { x: 0, y: 0 }, control: { x: 500, y: 100 }, target: { x: 1000, y: 0 } };
    const particle = smokeParticle(route, 600, 1000, 6500, 193);
    const from = screenFlightPoint(route, 600 / 6500);
    const after = screenFlightPoint(route, 620 / 6500);
    const velocity = { x: (after.x - from.x) * 50, y: (after.y - from.y) * 50 };
    const next = screenFlightPoint(route, 660 / 6500);
    const nextMotion = smokeMotion(0.34, velocity, 193 + 660);
    expect(particle.segmentEnd?.x).toBeCloseTo(next.x + nextMotion.x, 10);
    expect(particle.segmentEnd?.y).toBeCloseTo(next.y + nextMotion.y, 10);
    const oldMotion = smokeMotion(0.4, velocity, 193 + 600);
    expect(Math.abs(particle.segmentEnd!.x - (next.x + oldMotion.x))).toBeGreaterThan(0.01);
  });
});
