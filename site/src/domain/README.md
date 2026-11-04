# Domain

Pure calculations in physical and geographic units. This area has no React, MapLibre, Canvas, or browser dependencies.

Plan 01 provides `GeoPoint`, coordinate validation, great-circle surface distance, and destination calculations in `geodesy.ts`. Distances are kilometers; coordinates and bearings are degrees. Callers should validate inputs at this boundary. Tests in `tests/unit/` cover representative distance, round-trip, antimeridian, and invalid-input behavior.

`scenarioScale.ts` estimates the prototype's light-effect horizon in kilometers from per-warhead megatons and warhead count for map framing. It is a camera aid; later blast modeling can evolve independently of map projection.

`blast.ts` supplies `blastRadiiForYield` for one positive megaton yield. It returns nested fireball, severe, moderate, and light radii in kilometers, capped at the antipodal surface distance. The module uses the prototype's 10 kt calibration and has no camera or browser dependency. Tests cover its constants, representative yields, ordering, and monotonicity; [model notes](../../docs/model.md) state its limits.

`blastZones.ts` turns those radii into four non-overlapping geographic annuli and spherical surface areas in km². Its public `blastZones` and `sphericalCapAreaKm2` functions have no UI or projection dependency. The inner and outer distances remain authoritative when the camera pans, zooms, or crosses the antimeridian.

`cloud.ts` adds `cloudPeakForProfile` and `cloudGrowthAt` for the separate cloud instrument. The first accepts one impact's yield in megatons, burst height in kilometers, and nuclear/conventional kind; it returns an illustrative peak height above the surface in kilometers and an orbital-scale presentation flag. The second maps normalized blast progress to a bounded, monotone rise. Neither function reads the clock, map camera, or Canvas. The formulas and their physical limits are in [model notes](../../docs/model.md).
