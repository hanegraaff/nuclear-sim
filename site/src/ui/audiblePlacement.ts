/** CSS-pixel rectangle relative to the simulator viewport. */
export interface PlacementRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** CSS-pixel placement for an overlay that must clear fixed simulator panels. */
export interface OverlayPlacement {
  readonly left: number;
  readonly top: number;
}

/** Area shared by two rectangles, counting an eight-pixel readability gutter. */
function collisionArea(a: PlacementRect, b: PlacementRect): number {
  const gutter = 8;
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width + gutter) - Math.max(a.x, b.x - gutter));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height + gutter) - Math.max(a.y, b.y - gutter));
  return width * height;
}

/** Choose a fully visible candidate that clears controls, selector, and legends when space permits. */
export function placeAudibleOverlay(
  viewport: PlacementRect,
  size: Pick<PlacementRect, "width" | "height">,
  anchor: OverlayPlacement,
  blockers: readonly PlacementRect[],
  kind: "label" | "single-popup" | "multi-popup",
): OverlayPlacement {
  const control = blockers[0];
  const selector = blockers[1];
  const rightOfControl = control ? control.x + control.width + 14 : 14;
  const belowControl = control ? control.y + control.height + 14 : 14;
  const belowSelector = selector ? selector.y + selector.height + 12 : 72;
  const belowLastBlocker = blockers.length ? blockers.at(-1)!.y + blockers.at(-1)!.height + 12 : 12;
  const bottom = viewport.height - size.height - 16;
  const right = viewport.width - size.width - 12;
  const candidates = kind === "multi-popup"
    ? [[rightOfControl, bottom], [12, belowControl], [rightOfControl, belowControl], [right, belowControl], [right, bottom]]
    : kind === "label"
      ? [[anchor.left + 9, anchor.top - 18], [anchor.left - size.width - 9, anchor.top + 8], [anchor.left - size.width / 2, belowSelector], [right, belowControl], [right, belowLastBlocker], [12, belowLastBlocker], [12, belowControl]]
      : [[anchor.left + 20, anchor.top + 24], [anchor.left - size.width - 20, anchor.top + 24], [anchor.left + 20, anchor.top - size.height - 24], [rightOfControl, bottom], [12, belowControl], [right, belowControl]];
  let best: OverlayPlacement = { left: 12, top: 12 };
  let bestScore = Number.POSITIVE_INFINITY;
  for (const [rawLeft, rawTop] of candidates) {
    const left = Math.max(8, Math.min(viewport.width - size.width - 8, rawLeft!));
    const top = Math.max(8, Math.min(viewport.height - size.height - 8, rawTop!));
    const rectangle = { x: left, y: top, ...size };
    const overlap = blockers.reduce((sum, blocker) => sum + collisionArea(rectangle, blocker), 0);
    if (overlap === 0) return { left, top };
    if (overlap < bestScore) { best = { left, top }; bestScore = overlap; }
  }
  return best;
}
