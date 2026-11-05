/** Projected MIRV tests expose reversals that a geographic tangent alone cannot detect. */
import { describe, expect, it } from "vitest";
import { mirvImpactTargets } from "../../src/domain/mirv";
import { blastRadiiForYield } from "../../src/domain/blast";
import { projectedMirvPlan } from "../../src/rendering/animation/mirvProjectionSafety";
import type { GeoPoint } from "../../src/domain/geodesy";

const aim = { longitude: -73.9857, latitude: 40.7484 };
const targets = mirvImpactTargets(aim, 3, blastRadiiForYield(0.175).light);
const route = {
  start: { longitude: -74.068707, latitude: 40.676425 },
  control: { longitude: -74.027226, latitude: 40.712420 },
  target: aim,
};

/** A pitch-compressed, bearing-rotated local projection in CSS-pixel units. */
function projector(pitchDegrees: number, bearingDegrees: number) {
  const pitch = Math.cos(pitchDegrees * Math.PI / 180);
  const bearing = bearingDegrees * Math.PI / 180;
  return { toScreen: (point: GeoPoint) => {
    const east = (point.longitude - aim.longitude) * 84.2;
    const north = (point.latitude - aim.latitude) * 111.2;
    return { x: 700 + east * Math.cos(bearing) - north * Math.sin(bearing),
      y: 500 - (east * Math.sin(bearing) + north * Math.cos(bearing)) * pitch };
  } };
}

describe("projected MIRV launch safety", () => {
  it("adapts a previously reversing branch for every tested pitch and bearing", () => {
    for (const pitch of [0, 30, 60]) for (const bearing of [0, 45, 90, 135]) {
      const result = projectedMirvPlan(route, targets, projector(pitch, bearing), 6500, 45, 1508, 1080);
      expect(result.safe).toBe(true);
    }
  });

  it("accepts a long visible approach after pitch and bearing rotate the camera", () => {
    const approach = { start: { longitude: -74.25, latitude: 40.67 },
      control: { longitude: -74.12, latitude: 40.71 }, target: aim };
    const result = projectedMirvPlan(approach, targets, projector(45, 30), 6500, 45, 1508, 1080);
    expect(result.safe).toBe(true);
  });

  it("selects a camera-stable route for the formerly backward edge-entry third target", () => {
    const edgeRoute = {
      start: { longitude: -74.126476, latitude: 40.625647 },
      control: { longitude: -74.047203, latitude: 40.663464 },
      target: aim,
    };
    for (const pitch of [0, 30, 60]) for (const bearing of [0, 45, 90, 135]) {
      const result = projectedMirvPlan(edgeRoute, targets, projector(pitch, bearing), 6500, 45, 1508, 1080);
      expect(result.safe).toBe(true);
    }
  });
});
