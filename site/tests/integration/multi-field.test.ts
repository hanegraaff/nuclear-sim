/** Multi-field contracts cover bounded sampling, camera scale, palette, and expansion tails. */
import { describe, expect, it } from "vitest";
import { blastRadiiForYield } from "../../src/domain/blast";
import { expandingBlastIntensity, multiFieldBudget } from "../../src/rendering/effects/MultiBlastCanvasRenderer";
import { multiBlastColor, multiBlastDisplayIntensity } from "../../src/rendering/effects/multiBlastPalette";
import { mapDistanceScale } from "../../src/rendering/overlays/mapDistanceScale";

describe("multi-strike rendering contracts", () => {
  it("reduces mask size and redraw rate as strike count grows", () => {
    const small = multiFieldBudget(2);
    const five = multiFieldBudget(5);
    const dense = multiFieldBudget(20);
    expect(five).toEqual(small);
    expect(dense.width * dense.height).toBeLessThan(five.width * five.height);
    expect(dense.frameMs).toBeGreaterThan(five.frameMs);
  });

  it("renders an expanding front with a soft falloff that vanishes outside the modeled tail", () => {
    const radii = blastRadiiForYield(0.021);
    const travelled = radii.light / 2;
    expect(expandingBlastIntensity(0, radii, travelled)).toBe(1);
    expect(expandingBlastIntensity(travelled * 1.1, radii, travelled)).toBeGreaterThan(0);
    expect(expandingBlastIntensity(travelled * 1.25, radii, travelled)).toBe(0);
  });

  it("uses a purple-to-yellow thermal palette and a camera-derived stable scale", () => {
    const faint = multiBlastColor(0.1);
    const hot = multiBlastColor(0.9);
    expect(faint.blue).toBeGreaterThan(faint.red);
    expect(hot.red).toBeGreaterThan(hot.blue);
    const original = mapDistanceScale(40.7484, 10.6);
    const zoomed = mapDistanceScale(40.7484, 11.6);
    expect(mapDistanceScale(40.7484, 10.6)).toEqual(original);
    expect(zoomed.distanceKm).toBeLessThanOrEqual(original.distanceKm);
    expect(original.widthPx).toBeGreaterThanOrEqual(54);
    expect(zoomed.widthPx).toBeLessThanOrEqual(158);
  });

  it("keeps model overlap order while compressing the broad halo only in the color mapping", () => {
    expect(multiBlastDisplayIntensity(0)).toBe(0);
    expect(multiBlastDisplayIntensity(1)).toBe(1);
    expect(multiBlastDisplayIntensity(0.25)).toBeLessThan(0.1);
    expect(multiBlastDisplayIntensity(0.75)).toBeLessThan(0.6);
    expect(multiBlastDisplayIntensity(0.9)).toBeGreaterThan(0.8);
    expect(multiBlastDisplayIntensity(0.9)).toBeGreaterThan(multiBlastDisplayIntensity(0.75));
  });
});
