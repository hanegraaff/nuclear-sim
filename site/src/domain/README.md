# Domain

Pure calculations in physical and geographic units. This area has no React, MapLibre, Canvas, or browser dependencies.

Plan 01 provides `GeoPoint`, coordinate validation, great-circle surface distance, and destination calculations in `geodesy.ts`. Distances are kilometers; coordinates and bearings are degrees. Callers should validate inputs at this boundary. Tests in `tests/unit/` cover representative distance, round-trip, antimeridian, and invalid-input behavior.

`scenarioScale.ts` estimates the prototype's light-effect horizon in kilometers from per-warhead megatons and warhead count for map framing. It is a camera aid; later blast modeling can evolve independently of map projection.

`blast.ts` supplies `blastRadiiForYield` for one positive megaton yield. It returns nested fireball, severe, moderate, and light radii in kilometers, capped at the antipodal surface distance. The module uses the prototype's 10 kt calibration and has no camera or browser dependency. Tests cover its constants, representative yields, ordering, and monotonicity; [model notes](../../docs/model.md) state its limits.
