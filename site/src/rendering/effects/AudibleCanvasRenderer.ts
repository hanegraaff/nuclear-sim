import { audibleRadiusForLaunch } from "../../application/effectPresentation";
import { audibleIntensity, type AudibleBandId } from "../../domain/audible";
import type { MapCameraAdapter } from "../map/MapCameraAdapter";
import { buildAudibleInspection, drawAudibleInspection, type AudibleInspectionGeometry } from "../overlays/audibleInspection";
import { audibleColor } from "./audiblePalette";
import { restoreAudibleMeshAlpha } from "./audibleReprojection";
import { RangeCanvasRenderer } from "./RangeCanvasRenderer";

export { RANGE_WORK_CHUNK as AUDIBLE_WORK_CHUNK, RANGE_PREVIEW_SAMPLES as AUDIBLE_PREVIEW_SAMPLES, rangeFieldBounds as audibleFieldBounds } from "./RangeCanvasRenderer";
export type { RangeRasterBounds as AudibleRasterBounds } from "./RangeCanvasRenderer";

/** Geographic hearing field with the prototype's smooth green palette and bands. */
export class AudibleCanvasRenderer extends RangeCanvasRenderer<AudibleBandId, AudibleInspectionGeometry> {
  constructor(canvas: HTMLCanvasElement, camera: MapCameraAdapter, inspectionCanvas: HTMLCanvasElement) {
    super(canvas, camera, inspectionCanvas, {
      radiusForLaunch: audibleRadiusForLaunch,
      intensity: audibleIntensity,
      color: audibleColor,
      buildInspection: buildAudibleInspection,
      drawInspection: drawAudibleInspection,
      restoreMeshAlpha: restoreAudibleMeshAlpha,
    });
  }
}
