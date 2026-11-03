# Blast effect rendering

`BlastCanvasRenderer` paints one immutable strike above the satellite map. Its public `render` method consumes a launch, elapsed milliseconds, and CSS-pixel viewport dimensions; `invalidateProjection` drops the cached field after camera or viewport movement. `blastExpansion` and `blastColor` expose the prototype timing curve and kilometer-based presentation anchors for focused tests.

`buildBlastDistanceGrid` unprojects each visible mask sample through the camera, then measures great-circle distance from the stored geographic target. It returns kilometer distances without a Canvas dependency. The renderer caches this grid and its exact color samples between animation frames, then applies the animated radius and edge feather to an offscreen mask. Camera movement, pitch, rotation, resize, strike replacement, and Reset invalidate the cache. Invalid sky samples remain transparent.

At zero pitch, the white-gold center keeps its established screen-space gradient. At nonzero pitch, `groundGlowColor` samples the same geographic kilometer grid as the field; the renderer caches its offscreen light mask alongside the field. This makes the optical core lie on the ground plane without changing physical damage radii. The light is still a 2D illustration; Plan 08 adds the raised 3D dome.

This area depends on immutable application launch data, the pure domain model, and the map camera adapter. It never computes yields or owns the animation clock.

Plan 08 moves settled inspection strokes into a second Canvas above the WebGL dome. The field and optical ground glow stay on the lower Canvas; both canvases use the same camera frame and viewport size. If the separate inspection context is unavailable, the renderer falls back to its original single-canvas path.
