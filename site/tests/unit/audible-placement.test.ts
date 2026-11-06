/** Viewport placement tests use CSS-pixel fixtures to keep hearing annotations clear of fixed panels. */
import { describe, expect, it } from "vitest";
import { placeAudibleOverlay, type PlacementRect } from "../../src/ui/audiblePlacement";

function overlap(a: PlacementRect, b: PlacementRect): number {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

describe("Audible annotation placement", () => {
  it("puts a multi legend popup beside desktop instruments instead of beneath the cloud or distance scale", () => {
    const viewport = { x: 0, y: 0, width: 1104, height: 728 };
    const blockers = [{ x: 16, y: 16, width: 356, height: 510 }, { x: 850, y: 16, width: 238, height: 44 }, { x: 16, y: 590, width: 125, height: 42 }, { x: 16, y: 640, width: 298, height: 70 }];
    const size = { width: 250, height: 150 };
    const placed = placeAudibleOverlay(viewport, size, { left: 80, top: 660 }, blockers, "multi-popup");
    expect(blockers.every((blocker) => overlap({ x: placed.left, y: placed.top, ...size }, blocker) === 0)).toBe(true);
  });

  it("moves a narrow marker popup below the cloud and keeps a radius label clear of panels", () => {
    const viewport = { x: 0, y: 0, width: 390, height: 844 };
    const blockers = [{ x: 16, y: 16, width: 356, height: 394 }, { x: 14, y: 760, width: 260, height: 42 }];
    const popup = { width: 280, height: 155 };
    const label = { width: 122, height: 22 };
    for (const [kind, size, anchor] of [["single-popup", popup, { left: 160, top: 380 }], ["label", label, { left: 250, top: 300 }]] as const) {
      const placed = placeAudibleOverlay(viewport, size, anchor, blockers, kind);
      expect(blockers.every((blocker) => overlap({ x: placed.left, y: placed.top, ...size }, blocker) === 0)).toBe(true);
      expect(placed.left).toBeGreaterThanOrEqual(8);
      expect(placed.top + size.height).toBeLessThanOrEqual(viewport.height - 8);
    }
  });
});
