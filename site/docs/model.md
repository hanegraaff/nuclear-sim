# Model notes — Plans 01–06

Plan 01 introduces geographic calculations; Plan 05 adds the first blast-radius model. Fallout and range models arrive in later plans.

`src/domain/geodesy.ts` uses a spherical Earth with mean radius **6371 km**, matching the reference prototype. Great-circle distance uses the haversine formula. Destination calculations use a spherical bearing formula. Longitudes are normalized to [−180°, 180°), so a route crossing the antimeridian remains short. Inputs with non-finite coordinates, latitude outside [−90°, 90°], negative distance, or travel beyond the antipodal surface distance are rejected.

These formulas are appropriate for a map-scale illustrative simulator. They do not include terrain elevation, Earth ellipsoid corrections, or local surveying precision. Future effect models will consume geographic distance in kilometers and document their own assumptions here.

## Device input — Plan 02

The fixed catalog preserves the prototype's 47 displayed choices. Internal yields are megatons of TNT equivalent. Conventional entries are labeled separately from nuclear entries; later effect models must not offer nuclear fallout for conventional-only strikes. MIRV entries store both displayed aggregate yield and explicit per-warhead yield, so each future impact is modeled at the latter value. The three modeled loadouts are 3 × 0.175 Mt, 10 × 0.12 Mt, and 10 × 0.5 Mt.

Custom input accepts finite megatons from 0.000000001 Mt, the prototype's minimum, through 1,000,000,000 Mt, the catalog's 1 Pt upper study. These bounds keep future model calculations within a defined range. Group separators must divide three digits consistently; malformed text cannot resolve to a device profile and must not launch.

## Scenario framing — Plan 03

The camera estimates the prototype's light-effect radius as 4.8 km times the cube root of yield divided by 0.01 Mt, bounded to less than the antipodal surface distance. Its framing horizon is 1.08 times that radius for a single device or three times for a MIRV, subject to the same surface cap. The renderer converts this distance to a zoom using viewport dimensions and latitude. This estimate positions the camera; it is not a forecast or a rendered blast model.

## Incoming missile — Plan 04

The incoming path is a visual reconstruction of `prototype-code/app/missile-flight.mjs`, not a ballistic trajectory or travel-time prediction. At launch, the camera supplies a viewport-edge start and one bent control point; all three are stored as geographic coordinates. On each frame the renderer projects those points through the current camera, then samples their quadratic screen-space curve with progress raised to 1.16 over 6.5 seconds. The camera adapter selects the nearest world copy at the antimeridian. Smoke emission points stay on this projected route; their decorative CSS-pixel drift is damped over 0.22 seconds and fades within 3 seconds. Adjacent puffs use their own ages and seeds. None of these screen-space optical choices changes physical distance or future effect calculations. Launch angles vary by a deterministic golden-angle sequence: the first enters from the upper right for a reproducible reference frame, and each later launch uses a different edge direction.

## Single blast — Plan 05

`src/domain/blast.ts` reproduces the prototype's `radiiForYield` screening scale for one impact. For yield `Y` in Mt and the 10 kt reference `Y₀ = 0.01 Mt`, light, moderate, and severe radii are respectively `4.8`, `1.6`, and `0.8 km × (Y/Y₀)^(1/3)`. The fireball radius is `0.14 km × (Y/Y₀)^0.4`, bounded by the severe radius. All zones are nested and capped at the half-circumference of the 6371 km spherical Earth; the same prototype floor of 0.001 km prevents a zero-size effect. At 21 kt, the light radius is about 6.15 km, matching the rounded label in `Nuke Blast Top.png`.

These constants are transcribed from `prototype-code/app/page.tsx` and calibrated to its imagery, not derived from a validated damage calculation. Yield scaling omits burst height, terrain, shielding, building type, weather, and uncertainty. The conventional catalog entries use the same visual scale for now; their inclusion does not imply nuclear fallout. The field is a visual screening estimate and must not be used as emergency guidance.

The application stores radii with the strike, so subsequent device changes cannot resize an existing blast. A 6.5-second carrier flight leads into a 4.6-second expansion; the flash lasts 1.1 seconds. The field uses `1 − (1 − t)^2.15` for fast-first growth, with `t` normalized to the expansion duration. The renderer unprojects each visible mask sample and measures great-circle distance from ground zero in kilometers, so the surface radius remains meaningful across zoom, latitude, and longitude wrapping. The distance grid is cached between animation frames and rebuilt after camera or viewport changes. The mask is capped to roughly 640 × 420 samples and smoothed on display; a dedicated pitched-ground treatment is scheduled for Plan 07. Color anchors, the shock ring, and the brighter white-gold corona are visual reconstructions, not physical wave-front or radiation predictions.

## Blast inspection — Plan 06

`src/domain/blastZones.ts` divides each blast into fireball, severe, moderate, and light annuli. For a surface radius `r` on the same 6371 km sphere, the enclosed area is `4πR² sin²(r/(2R))` square kilometers; each zone area subtracts its inner cap from its outer cap. This stable form agrees with the prototype's spherical-cap calculation even for small radii. The 21 kt light annulus is about 105.5 km², as displayed in `MarkersAnd Popups.jpeg`. Labels, colors, and damage descriptions reproduce the prototype's illustrative language. Neither a zone boundary nor its area predicts actual casualties or building damage: shielding, terrain, burst height, and local construction are not modeled. Marker positions and the ruler are geodesic destinations from ground zero; the current map camera only projects them for display.
