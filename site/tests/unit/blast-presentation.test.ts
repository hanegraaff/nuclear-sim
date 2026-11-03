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
    expect(blastColor(radii.fireball * 0.52, radii)).toEqual({ red: 255, green: 248, blue: 204, alpha: 0.97 });
    expect(blastColor(radii.fireball, radii)).toEqual({ red: 255, green: 167, blue: 48, alpha: 0.84 });
    expect(blastColor(radii.severe, radii)).toEqual({ red: 242, green: 63, blue: 48, alpha: 0.62 });
    expect(blastColor(radii.moderate, radii)).toEqual({ red: 201, green: 40, blue: 111, alpha: 0.46 });
    expect(blastColor(radii.light, radii)).toEqual({ red: 93, green: 59, blue: 169, alpha: 0.36 });
    expect(blastColor(radii.moderate, radii).red).toBeGreaterThan(blastColor(radii.light, radii).red);
  });
});
