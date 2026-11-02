import { geoPoint, normalizeLongitude, type GeoPoint } from "../../domain/geodesy";

/** Point in CSS pixels relative to the map container's upper-left corner. */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/** Small projection contract supplied by MapLibre and easy to fake in tests. */
export interface MapProjection {
  project(coordinates: [number, number]): ScreenPoint;
  unproject(coordinates: [number, number]): { lng: number; lat: number };
  getCenter(): { lng: number; lat: number };
  getZoom(): number;
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

  /** Read the current center and zoom for UI state and camera tests. */
  snapshot(): { center: GeoPoint; zoom: number } {
    const center = this.map.getCenter();
    return { center: geoPoint(center.lng, center.lat), zoom: this.map.getZoom() };
  }
}
