/** Screen-geometry tests check carrier sharing and position/velocity continuity at separation. */
import { describe, expect, it } from "vitest";
import { screenFlightPoint, screenMirvPoint, type ProjectedMirvRoute } from "../../src/rendering/animation/flightGeometry";

const route: ProjectedMirvRoute = {
  carrier: { start: { x: 1400, y: 80 }, control: { x: 1140, y: 240 }, target: { x: 800, y: 580 } },
  target: { x: 760, y: 610 },
  splitMs: 3900,
  carrierFlightMs: 6500,
  flightMs: 6545,
};

describe("MIRV carrier separation", () => {
  it("keeps all branches at the shared carrier position at split and ends at each impact target", () => {
    const split = screenFlightPoint(route.carrier, route.splitMs / route.carrierFlightMs);
    const another = { ...route, target: { x: 1050, y: 460 }, flightMs: 6680 };
    expect(screenMirvPoint(route, route.splitMs)).toEqual(split);
    expect(screenMirvPoint(another, another.splitMs)).toEqual(split);
    expect(screenMirvPoint(route, route.flightMs)).toEqual(route.target);
    expect(screenMirvPoint(another, another.flightMs)).toEqual(another.target);
  });

  it("preserves the carrier's velocity through the split", () => {
    const epsilonMs = 0.01;
    const before = screenMirvPoint(route, route.splitMs - epsilonMs);
    const at = screenMirvPoint(route, route.splitMs);
    const after = screenMirvPoint(route, route.splitMs + epsilonMs);
    // A 0.001 CSS-pixel/ms tolerance covers finite-difference curvature over
    // 0.01 ms, far below a visible one-frame position change.
    expect(Math.abs((at.x - before.x) / epsilonMs - (after.x - at.x) / epsilonMs)).toBeLessThan(0.001);
    expect(Math.abs((at.y - before.y) / epsilonMs - (after.y - at.y) / epsilonMs)).toBeLessThan(0.001);
  });

  it("matches the prototype's middle branch and nonzero approach velocity", () => {
    const middle = screenMirvPoint(route, 5222.5);
    const nearImpact = screenMirvPoint(route, route.flightMs - 1);
    const impact = screenMirvPoint(route, route.flightMs);
    // These fixed CSS-pixel samples come from prototype-code/app/missile-flight.mjs
    // for the route above. 0.01 px allows arithmetic rounding, not a different
    // cubic handle; the latter shifts the middle by tens of pixels.
    expect(middle.x).toBeCloseTo(913.0724, 2);
    expect(middle.y).toBeCloseTo(469.0843, 2);
    // The prototype still travels toward the target during its last 1 ms.
    // 0.001 px admits finite-difference curvature over that short interval.
    expect(impact.x - nearImpact.x).toBeCloseTo(-0.06702, 3);
    expect(impact.y - nearImpact.y).toBeCloseTo(0.06090, 3);
  });

  it("rejects malformed split timing", () => {
    expect(() => screenMirvPoint({ ...route, splitMs: 7000 }, 4000)).toThrow(RangeError);
  });
});
