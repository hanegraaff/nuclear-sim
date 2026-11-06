import { geoPoint, normalizeLongitude, type GeoPoint } from "../../domain/geodesy";

/** Point in CSS pixels relative to the map container's upper-left corner. */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/** Rendering-only geographic coordinate retaining the map's world-copy longitude. */
export interface UnwrappedGeoPoint {
  readonly longitude: number;
  readonly latitude: number;
}

/** Small projection contract supplied by MapLibre and easy to fake in tests. */
export interface MapProjection {
  project(coordinates: [number, number]): ScreenPoint;
  unproject(coordinates: [number, number]): { lng: number; lat: number };
  getCenter(): { lng: number; lat: number };
  getZoom(): number;
  getPitch(): number;
  getBearing(): number;
}

/**
 * Converts between domain geography and map-screen coordinates. This boundary
 * keeps camera projection out of the physical model.
 */
export class MapCameraAdapter {
  constructor(private readonly map: MapProjection) {}

  /** Project a geographic point in degrees to a CSS-pixel position. */
  toScreen(point: GeoPoint): ScreenPoint {
    const center = this.map.getCenter();
    return this.map.project([center.lng + normalizeLongitude(point.longitude - center.lng), point.latitude]);
  }

  /** Unproject a CSS-pixel position to a validated geographic point in degrees. */
  toGeo(point: ScreenPoint): GeoPoint {
    const coordinate = this.map.unproject([point.x, point.y]);
    return geoPoint(coordinate.lng, coordinate.lat);
  }

  /** Unproject CSS pixels without normalizing longitude, so repeated world copies remain distinct. */
  toGeoUnwrapped(point: ScreenPoint): UnwrappedGeoPoint {
    const coordinate = this.map.unproject([point.x, point.y]);
    if (!Number.isFinite(coordinate.lng) || !Number.isFinite(coordinate.lat) || Math.abs(coordinate.lat) > 90) {
      throw new RangeError("Screen point cannot be projected onto Earth.");
    }
    return { longitude: coordinate.lng, latitude: coordinate.lat };
  }

  /** Project a specific unwrapped world copy into CSS pixels. */
  toScreenUnwrapped(point: UnwrappedGeoPoint): ScreenPoint {
    return this.map.project([point.longitude, point.latitude]);
  }

  /** Return the raw map-center longitude in degrees for choosing a matching world copy. */
  unwrappedCenterLongitude(): number { return this.map.getCenter().lng; }

  /** Read the current center, zoom, pitch, and bearing in geographic/map degrees. */
  snapshot(): { center: GeoPoint; zoom: number; pitch: number; bearing: number } {
    const center = this.map.getCenter();
    return { center: geoPoint(center.lng, center.lat), zoom: this.map.getZoom(), pitch: this.map.getPitch(), bearing: this.map.getBearing() };
  }
}
