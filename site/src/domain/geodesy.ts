/** Mean Earth radius used by the prototype's surface-distance model, in kilometers. */
export const EARTH_RADIUS_KM = 6371;

/** Geographic position in degrees, with east-positive longitude and north-positive latitude. */
export interface GeoPoint {
  readonly longitude: number;
  readonly latitude: number;
}

const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_RADIAN = 180 / Math.PI;

/**
 * Normalize a finite longitude to [-180, 180). This keeps antimeridian results
 * stable while allowing callers to supply equivalent wrapped longitudes.
 */
export function normalizeLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) throw new RangeError("Longitude must be finite.");
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

/** Validate and normalize a geographic point before it enters the model. */
export function geoPoint(longitude: number, latitude: number): GeoPoint {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError("Latitude must be finite and between -90 and 90 degrees.");
  }
  return { longitude: normalizeLongitude(longitude), latitude };
}

/**
 * Great-circle surface distance between two geographic points, in kilometers.
 * The haversine expression is stable for short distances and the antimeridian.
 */
export function surfaceDistanceKm(start: GeoPoint, end: GeoPoint): number {
  const latitudeA = start.latitude * RADIANS_PER_DEGREE;
  const latitudeB = end.latitude * RADIANS_PER_DEGREE;
  const latitudeDelta = latitudeB - latitudeA;
  const longitudeDelta = (end.longitude - start.longitude) * RADIANS_PER_DEGREE;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
}

/**
 * Destination after travelling a great-circle distance in kilometers along a
 * clockwise bearing in degrees from north. Rejects non-finite or negative distances.
 */
export function destinationPoint(origin: GeoPoint, distanceKm: number, bearingDegrees: number): GeoPoint {
  if (!Number.isFinite(distanceKm) || distanceKm < 0 || distanceKm > Math.PI * EARTH_RADIUS_KM) {
    throw new RangeError("Distance must be finite and within the Earth-surface limit.");
  }
  if (!Number.isFinite(bearingDegrees)) throw new RangeError("Bearing must be finite.");
  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearing = bearingDegrees * RADIANS_PER_DEGREE;
  const latitudeA = origin.latitude * RADIANS_PER_DEGREE;
  const longitudeA = origin.longitude * RADIANS_PER_DEGREE;
  const latitudeB = Math.asin(
    Math.sin(latitudeA) * Math.cos(angularDistance)
      + Math.cos(latitudeA) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const longitudeB = longitudeA + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitudeA),
    Math.cos(angularDistance) - Math.sin(latitudeA) * Math.sin(latitudeB),
  );
  return geoPoint(longitudeB * DEGREES_PER_RADIAN, latitudeB * DEGREES_PER_RADIAN);
}
