/** A lower-left scale labeled in kilometers and sized in CSS pixels. */
export interface MapDistanceScale {
  readonly distanceKm: number;
  readonly widthPx: number;
}

/** Prototype-style 1/2/5 step at the order of a desired geographic distance. */
function niceDistanceKm(targetKm: number): number {
  const safe = Math.max(0.0001, targetKm);
  const magnitude = 10 ** Math.floor(Math.log10(safe));
  const normalized = safe / magnitude;
  return (normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1) * magnitude;
}

/**
 * Estimate center-latitude ground scale from a MapLibre zoom and latitude.
 * The bar is an illustrative center-camera reference in pitched views, not
 * a local survey measurement at every screen point.
 */
export function mapDistanceScale(latitudeDegrees: number, zoom: number): MapDistanceScale {
  if (!Number.isFinite(latitudeDegrees) || !Number.isFinite(zoom) || Math.abs(latitudeDegrees) > 90) {
    throw new RangeError("Map scale requires finite latitude degrees and zoom.");
  }
  const latitudeScale = Math.max(0.04, Math.cos(latitudeDegrees * Math.PI / 180));
  const metersPerPixel = 156543.03392 * latitudeScale / 2 ** zoom;
  const distanceKm = niceDistanceKm(metersPerPixel * 132 / 1000);
  return { distanceKm, widthPx: Math.max(54, Math.min(158, distanceKm * 1000 / metersPerPixel)) };
}
