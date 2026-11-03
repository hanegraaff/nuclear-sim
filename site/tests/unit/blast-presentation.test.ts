/** Presentation tests lock the prototype's fast-first easing and nested white-to-purple palette. */
import { describe, expect, it } from "vitest";
import { blastRadiiForYield } from "../../src/domain/blast";
import { blastColor, blastExpansion } from "../../src/rendering/effects/BlastCanvasRenderer";

describe("single-blast presentation samples", () => {
  it("expands faster in the first half and settles at the modeled radius", () => {
    expect(blastExpansion(-1)).toBe(0);
    expect(blastExpansion(1)).toBe(1);
    expect(blastExpansion(2)).toBe(1);
    expect(blastExpansion(0.5)).toBeGreaterThan(0.5);
    expect(blastExpansion(0.5)).toBeLessThan(1);
  });

  it("renders a light center and translucent purple outer edge from kilometer bands", () => {
    const radii = blastRadiiForYield(0.01);
    expect(blastColor(0, radii)).toEqual({ red: 255, green: 255, blue: 247, alpha: 0.995 });
    expect(blastColor(radii.light, radii)).toEqual({ red: 93, green: 59, blue: 169, alpha: 0.36 });
    expect(blastColor(radii.moderate, radii).red).toBeGreaterThan(blastColor(radii.light, radii).red);
  });
});
