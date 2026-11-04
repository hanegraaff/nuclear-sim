/** Cloud plot geometry tests guard fixed-scale placement through growth and resize without map inputs. */
import { describe, expect, it } from "vitest";
import { cloudPlotGeometry } from "../../src/rendering/cloud/paintCloudProfile";

describe("independent cloud plot geometry", () => {
  it("moves the top upward while keeping the height scale fixed", () => {
    const initial = cloudPlotGeometry(356, 124, 0);
    const middle = cloudPlotGeometry(356, 124, 0.5);
    const peak = cloudPlotGeometry(356, 124, 1);
    expect(initial.cloudTopY).toBe(initial.baseY);
    expect(middle.cloudTopY).toBeCloseTo((initial.baseY + initial.topY) / 2, 6);
    expect(peak.cloudTopY).toBe(peak.topY);
    expect(peak.scaleX).toBe(initial.scaleX);
  });

  it("repositions the scale for a narrower viewport while preserving baseline margins", () => {
    const wide = cloudPlotGeometry(356, 124, 1);
    const narrow = cloudPlotGeometry(280, 100, 1);
    expect(wide.scaleX).toBe(314);
    expect(narrow.scaleX).toBe(238);
    expect(narrow.baseY).toBe(83);
  });
});
