import type { BlastRadii } from "../../domain/blast";

/** RGBA of one geographic blast; RGB channels are bytes, alpha is 0–1. */
export type BlastColor = { readonly red: number; readonly green: number; readonly blue: number; readonly alpha: number };
/** Physical-distance color anchor in km, RGB byte channels, and unit alpha. */
export type ColorAnchor = { readonly distance: number; readonly color: readonly [number, number, number]; readonly alpha: number };

/** Ordered color anchors preserve the prototype's narrow fireball boundary. */
export function blastColorAnchors(radii: BlastRadii): readonly ColorAnchor[] {
  return [
    { distance: 0, color: [255, 255, 247], alpha: 0.995 },
    { distance: radii.fireball * 0.52, color: [255, 248, 204], alpha: 0.97 },
    { distance: radii.fireball, color: [255, 167, 48], alpha: 0.84 },
    { distance: radii.severe, color: [242, 63, 48], alpha: 0.62 },
    { distance: radii.moderate, color: [201, 40, 111], alpha: 0.46 },
    { distance: radii.light, color: [93, 59, 169], alpha: 0.36 },
  ];
}

/** Interpolate physical-distance anchors, including each narrow boundary. */
export function colorAtDistance(distanceKm: number, anchors: readonly ColorAnchor[]): BlastColor {
  const upperIndex = Math.max(1, anchors.findIndex((anchor) => distanceKm <= anchor.distance));
  const lower = anchors[upperIndex - 1]!;
  const upper = anchors[upperIndex] ?? anchors[anchors.length - 1]!;
  const fraction = Math.max(0, Math.min(1, (distanceKm - lower.distance) / Math.max(0.0001, upper.distance - lower.distance)));
  return {
    red: Math.round(lower.color[0]! + (upper.color[0]! - lower.color[0]!) * fraction),
    green: Math.round(lower.color[1]! + (upper.color[1]! - lower.color[1]!) * fraction),
    blue: Math.round(lower.color[2]! + (upper.color[2]! - lower.color[2]!) * fraction),
    alpha: lower.alpha + (upper.alpha - lower.alpha) * fraction,
  };
}

/** Color and opacity at a surface distance in km for one modeled blast. */
export function blastColor(distanceKm: number, radii: BlastRadii): BlastColor {
  return colorAtDistance(distanceKm, blastColorAnchors(radii));
}

/** Sample the single-reference disk and its expanding purple feather at distances in km. */
export function createBlastFieldSampler(radii: BlastRadii): (distanceKm: number, travelledKm: number) => BlastColor {
  const anchors = blastColorAnchors(radii);
  return (distanceKm, travelledKm) => {
    if (!Number.isFinite(distanceKm) || travelledKm <= 0 || distanceKm > travelledKm * 1.24) return { red: 0, green: 0, blue: 0, alpha: 0 };
    if (distanceKm <= travelledKm) return colorAtDistance(distanceKm, anchors);
    const fraction = (distanceKm - travelledKm) / Math.max(0.000001, travelledKm * .24);
    return { red: 112, green: 73, blue: 201, alpha: Math.round(76 * (1 - fraction * fraction * (3 - 2 * fraction))) / 255 };
  };
}
