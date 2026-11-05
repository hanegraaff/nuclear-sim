# Domain model

This package calculates geographic and physical values without React, MapLibre, Canvas, WebGL, browser globals, or an animation clock. Inputs and outputs use geographic degrees, kilometers, megatons of TNT equivalent, and normalized display intensities as stated by each API. Rendering may change its palette without changing these calculations.

| Module | Public purpose and invariant |
| --- | --- |
| `geodesy.ts` | `GeoPoint` validation, great-circle distance, destination points, and longitude normalization on a 6371 km sphere. Antimeridian routes use the short wrapped path. |
| `scenarioScale.ts` | A bounded light-effect horizon in kilometers to frame a selected scenario; it is a camera aid, not a rendered effect. |
| `blast.ts` | `blastRadiiForYield` maps one positive impact yield in megatons to ordered fireball, severe, moderate, and light radii in kilometers. |
| `blastZones.ts` | `blastZones` and `sphericalCapAreaKm2` turn those radii into non-overlapping spans and spherical surface areas in square kilometers. |
| `mirv.ts` | `mirvImpactTargets` places a catalog loadout deterministically around the clicked geographic aim point. Count and the light-damage radius describe **individual** warheads; repeated inputs give the same distinct targets. |
| `cloud.ts` | `cloudPeakForProfile` estimates one impact's peak height in kilometers; `cloudGrowthAt` maps normalized blast progress to a bounded rise. |
| `fallout.ts` | `modelFallout` freezes one nuclear warhead's deterministic wind, physical deposition lobes, and H+24 dimensions. `falloutIntensityAt` evaluates a bounded unitless field at a geographic point; `falloutIntensityAtLocal` evaluates the same kernel in great-circle east/north kilometers for reusable texture sampling; `falloutCenterline` and `falloutZones` supply inspection geometry and approximate km² areas. No camera, live weather, or calculated dose enters the model. |
| `overlap.ts` | `blastDamageIntensity` evaluates one field at a great-circle distance. `combineBlastIntensities` and `combineBlastPeakAndSum` produce bounded, order-independent display intensity without adding yields or changing radii. |

Application state owns which inputs belong to a click, when each warhead arrives, and which effect is active. This package does not use screen coordinates or time to decide a physical range. Tests in `tests/unit/` cover representative values, monotonicity, invalid input, antimeridian crossings, deterministic MIRV spread, latitude-band wind, fallout scaling and geographic texture, and overlap invariants. Fallout noise is fixed in physical coordinates, so moving the camera cannot change its contour values. Printed Gy ranges label the prototype screening bands; normalized intensity is not a dose calculation. [Model notes](../../docs/model.md) give sources, equations, and limits; none of these outputs is a measured forecast.
