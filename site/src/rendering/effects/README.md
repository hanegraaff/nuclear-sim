# Blast effect rendering

`BlastCanvasRenderer` paints one immutable strike above the satellite map. Its public `render` method consumes a launch, elapsed milliseconds, and CSS-pixel viewport dimensions; `invalidateProjection` drops the cached field after camera or viewport movement. `blastExpansion` and `blastColor` expose the prototype timing curve and kilometer-based presentation anchors for focused tests.

`buildBlastDistanceGrid` unprojects each visible mask sample through the camera, then measures great-circle distance from the stored geographic target. It returns kilometer distances without a Canvas dependency. The renderer caches this grid and its exact color samples between animation frames, then applies the animated radius and edge feather to an offscreen mask. Camera movement, resize, strike replacement, and Reset invalidate the cache. Invalid sky samples remain transparent. The geodesic field is authoritative; the central white-gold corona and glare are decorative screen-space light. Pitch-specific terrain and inspection overlays remain scheduled for Plan 07.

This area depends on immutable application launch data, the pure domain model, and the map camera adapter. It never computes yields or owns the animation clock.
