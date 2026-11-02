/** Camera-boundary tests use a reversible fake projection in CSS pixels. */
import { describe, expect, it } from "vitest";
import { geoPoint } from "../../src/domain/geodesy";
import { MapCameraAdapter, type MapProjection } from "../../src/rendering/map/MapCameraAdapter";
import { INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM, satelliteStyle } from "../../src/rendering/map/createSatelliteMap";

describe("map camera boundary", () => {
  it("round-trips geography through the projection without changing physical coordinates", () => {
    const fakeMap: MapProjection = {
      project: ([longitude, latitude]) => ({ x: longitude * 4 + 500, y: latitude * -4 + 300 }),
      unproject: ([x, y]) => ({ lng: (x - 500) / 4, lat: (300 - y) / 4 }),
      getCenter: () => ({ lng: -73.9857, lat: 40.7484 }),
      getZoom: () => 10.6,
    };
    const camera = new MapCameraAdapter(fakeMap);
    const position = geoPoint(-73.9, 40.7);
    const roundTrip = camera.toGeo(camera.toScreen(position));
    expect(roundTrip.longitude).toBeCloseTo(position.longitude, 10);
    expect(roundTrip.latitude).toBeCloseTo(position.latitude, 10);
    expect(camera.snapshot()).toEqual({ center: INITIAL_MAP_CENTER, zoom: INITIAL_MAP_ZOOM });
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
