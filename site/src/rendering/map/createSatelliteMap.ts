import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { geoPoint } from "../../domain/geodesy";

/** Prototype's initial Midtown Manhattan camera, expressed in model coordinates. */
export const INITIAL_MAP_CENTER = geoPoint(-73.9857, 40.7484);
/** Prototype's initial map zoom. */
export const INITIAL_MAP_ZOOM = 10.6;

const IMAGERY_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/** Satellite raster style with the imagery attribution visible to users. */
export function satelliteStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: [IMAGERY_URL],
        tileSize: 256,
        attribution: "Tiles © Esri — Esri, Maxar, Earthstar Geographics",
      },
    },
    layers: [{
      id: "satellite",
      type: "raster",
      source: "satellite",
      paint: {
        "raster-saturation": -0.22,
        "raster-contrast": 0.08,
        "raster-brightness-min": 0.08,
        "raster-brightness-max": 0.92,
      },
    }],
  };
}

/** Create the map and its prototype-style zoom controls. Caller owns removal. */
export function createSatelliteMap(container: HTMLElement): MapLibreMap {
  maplibregl.setWorkerUrl(workerUrl);
  const map = new maplibregl.Map({
    container,
    style: satelliteStyle(),
    center: [INITIAL_MAP_CENTER.longitude, INITIAL_MAP_CENTER.latitude],
    zoom: INITIAL_MAP_ZOOM,
    minZoom: 0.75,
    maxZoom: 18,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
  return map;
}
