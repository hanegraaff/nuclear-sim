# Cloud instrument rendering

`paintCloudProfile` draws the Plan 09 instrument's grid, height scale, warm ignition light, stem, and soft plume cap on a Canvas 2D context. `cloudPlotGeometry` converts the supplied CSS-pixel width, height, and normalized growth into plot coordinates. The caller supplies an immutable `CloudPresentation`; this package does not calculate yield, advance animation time, or read a MapLibre camera.

The painter clears and redraws one frame. Its puff texture uses fixed numeric seeds, so a paused frame is stable across repaints. The UI owns canvas size and device-pixel-ratio setup, then calls the painter when its presentation changes or the panel resizes. The scale always represents the modeled peak height above the surface; its tick positions remain fixed while the current-height line and silhouette rise. The canvas is decorative; the UI provides the textual height and phase for accessibility.

The cloud's shape and glow are optical illustrations of the prototype, not a simulation of fluid flow, smoke transport, or radioactive material. Physical assumptions belong to the pure [domain model](../../domain/README.md) and [model notes](../../../docs/model.md).
