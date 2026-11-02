/** Prototype flight geometry tests cover edge entry, continuity, antimeridian, and smoke age. */
import { describe, expect, it } from "vitest";
import { flightPoint, smokeMotion, viewportFlightRoute } from "../../src/rendering/animation/flightGeometry";

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

  it("arrives exactly at the target without a position jump", () => {
    const route = { start: { longitude: -74.2, latitude: 41 }, control: { longitude: -74, latitude: 40.9 }, target: { longitude: -73.8, latitude: 40.7 } };
    expect(flightPoint(route, 0)).toEqual(route.start);
    expect(flightPoint(route, 1)).toEqual(route.target);
    for (let step = 1; step <= 100; step++) {
      const previous = flightPoint(route, (step - 1) / 100);
      const current = flightPoint(route, step / 100);
      expect(Math.hypot(current.longitude - previous.longitude, current.latitude - previous.latitude)).toBeLessThan(0.01);
    }
  });

  it("takes the short geographic arc across the antimeridian", () => {
    const route = { start: { longitude: 179.7, latitude: 20 }, control: { longitude: -179.9, latitude: 20.1 }, target: { longitude: -179.5, latitude: 20.2 } };
    const midpoint = flightPoint(route, 0.5);
    expect(Math.abs(midpoint.longitude)).toBeGreaterThan(179);
    expect(flightPoint(route, 1)).toEqual(route.target);
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
});
