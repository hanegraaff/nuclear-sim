import { visibleRadiusForLaunch } from "../../application/effectPresentation";
import { visibleIntensity, type VisibleBandId } from "../../domain/visible";
import type { MapCameraAdapter } from "../map/MapCameraAdapter";
import { buildVisibleInspection, drawVisibleInspection, type VisibleInspectionGeometry } from "../overlays/visibleInspection";
import { restoreVisibleMeshAlpha, visibleColor } from "./visiblePalette";
import { RangeCanvasRenderer } from "./RangeCanvasRenderer";

/** Direct-fireball sightline field with a smooth navy-to-ice-blue palette. */
export class VisibleCanvasRenderer extends RangeCanvasRenderer<VisibleBandId, VisibleInspectionGeometry> {
  constructor(canvas: HTMLCanvasElement, camera: MapCameraAdapter, inspectionCanvas: HTMLCanvasElement) {
    super(canvas, camera, inspectionCanvas, {
      radiusForLaunch: visibleRadiusForLaunch,
      intensity: visibleIntensity,
      color: visibleColor,
      buildInspection: buildVisibleInspection,
      drawInspection: drawVisibleInspection,
      restoreMeshAlpha: restoreVisibleMeshAlpha,
    });
  }
}
