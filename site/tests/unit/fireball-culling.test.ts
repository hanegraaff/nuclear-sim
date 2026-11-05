/** Conservative clip-plane tests keep edge domes visible and skip fully offscreen GPU draws. */
import { describe, expect, it } from "vitest";
import { fireballIntersectsClipViewport } from "../../src/rendering/animation/FireballRenderer";

/** Clip-space transform for a unit dome with a chosen center and radius. */
function domeTransform(x: number, y: number, radius: number): Float32Array {
  return new Float32Array([
    radius, 0, 0, 0,
    0, radius, 0, 0,
    0, 0, radius, 0,
    x, y, 0, 1,
  ]);
}

describe("fireball viewport culling", () => {
  it("retains centered and edge-crossing domes while rejecting those fully beyond each viewport side", () => {
    expect(fireballIntersectsClipViewport(domeTransform(0, 0, 0.2))).toBe(true);
    expect(fireballIntersectsClipViewport(domeTransform(1.2, 0, 0.3))).toBe(true);
    expect(fireballIntersectsClipViewport(domeTransform(-1.2, 0, 0.3))).toBe(true);
    for (const [x, y] of [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]) {
      expect(fireballIntersectsClipViewport(domeTransform(x!, y!, 0.2))).toBe(false);
    }
  });

  it("keeps a pitched dome whose vertical extent reaches the viewport", () => {
    const pitched = domeTransform(0, 1.4, 0.2);
    // z extends upward into view; a center-only cull would lose this dome.
    pitched[9] = -0.5;
    expect(fireballIntersectsClipViewport(pitched)).toBe(true);
  });
});
