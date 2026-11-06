/** Camera-boundary tests use a reversible fake projection in CSS pixels. */
import { describe, expect, it } from "vitest";
import { geoPoint } from "../../src/domain/geodesy";
import { MapCameraAdapter, type MapProjection } from "../../src/rendering/map/MapCameraAdapter";
import { projectFlightRoute, screenFlightPoint } from "../../src/rendering/animation/flightGeometry";
import { INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM, satelliteStyle } from "../../src/rendering/map/createSatelliteMap";

describe("map camera boundary", () => {
  it("round-trips geography through the projection without changing physical coordinates", () => {
    const fakeMap: MapProjection = {
      project: ([longitude, latitude]) => ({ x: longitude * 4 + 500, y: latitude * -4 + 300 }),
      unproject: ([x, y]) => ({ lng: (x - 500) / 4, lat: (300 - y) / 4 }),
      getCenter: () => ({ lng: -73.9857, lat: 40.7484 }),
      getZoom: () => 10.6,
      getPitch: () => 0,
      getBearing: () => 0,
    };
    const camera = new MapCameraAdapter(fakeMap);
    const position = geoPoint(-73.9, 40.7);
    const roundTrip = camera.toGeo(camera.toScreen(position));
    expect(roundTrip.longitude).toBeCloseTo(position.longitude, 10);
    expect(roundTrip.latitude).toBeCloseTo(position.latitude, 10);
    expect(camera.snapshot()).toEqual({ center: INITIAL_MAP_CENTER, zoom: INITIAL_MAP_ZOOM, pitch: 0, bearing: 0 });
  });

  it("projects an antimeridian target into the nearest visible world copy", () => {
    const fakeMap: MapProjection = {
      project: ([longitude, latitude]) => ({ x: longitude, y: latitude }),
      unproject: ([x, y]) => ({ lng: x, lat: y }),
      getCenter: () => ({ lng: 179.8, lat: 20 }),
      getZoom: () => 4,
      getPitch: () => 50,
      getBearing: () => 25,
    };
    const camera = new MapCameraAdapter(fakeMap);
    expect(camera.snapshot()).toMatchObject({ pitch: 50, bearing: 25 });
    expect(camera.toScreen(geoPoint(-179.9, 20)).x).toBeCloseTo(180.1, 10);
    expect(camera.toGeoUnwrapped({ x: 540.1, y: 20 })).toEqual({ longitude: 540.1, latitude: 20 });
    expect(camera.toScreenUnwrapped({ longitude: 540.1, latitude: 20 }).x).toBeCloseTo(540.1, 10);
    expect(camera.unwrappedCenterLongitude()).toBe(179.8);
    const route = projectFlightRoute({
      start: geoPoint(179.7, 20),
      control: geoPoint(-179.9, 20.1),
      target: geoPoint(-179.5, 20.2),
    }, camera);
    expect(route.control.x).toBeCloseTo(180.1, 10);
    expect(route.target.x).toBeCloseTo(180.5, 10);
    expect(screenFlightPoint(route, 0.5).x).toBeGreaterThan(179.7);
    expect(screenFlightPoint(route, 0.5).x).toBeLessThan(180.5);
  });

  it("declares a satellite raster source and visible attribution", () => {
    const style = satelliteStyle();
    const source = style.sources.satellite;
    if (!source || source.type !== "raster") throw new Error("Expected a satellite raster source.");
    expect(source.type).toBe("raster");
    expect(source.attribution).toContain("Esri");
    expect(style.layers[0]?.id).toBe("satellite");
  });
});
