# Model notes — Plans 01–04

Plan 01 includes geographic calculations only; blast, fallout, and range models arrive in later plans.

`src/domain/geodesy.ts` uses a spherical Earth with mean radius **6371 km**, matching the reference prototype. Great-circle distance uses the haversine formula. Destination calculations use a spherical bearing formula. Longitudes are normalized to [−180°, 180°), so a route crossing the antimeridian remains short. Inputs with non-finite coordinates, latitude outside [−90°, 90°], negative distance, or travel beyond the antipodal surface distance are rejected.

These formulas are appropriate for a map-scale illustrative simulator. They do not include terrain elevation, Earth ellipsoid corrections, or local surveying precision. Future effect models will consume geographic distance in kilometers and document their own assumptions here.

## Device input — Plan 02

The fixed catalog preserves the prototype's 47 displayed choices. Internal yields are megatons of TNT equivalent. Conventional entries are labeled separately from nuclear entries; later effect models must not offer nuclear fallout for conventional-only strikes. MIRV entries store both displayed aggregate yield and explicit per-warhead yield, so each future impact is modeled at the latter value. The three modeled loadouts are 3 × 0.175 Mt, 10 × 0.12 Mt, and 10 × 0.5 Mt.

Custom input accepts finite megatons from 0.000000001 Mt, the prototype's minimum, through 1,000,000,000 Mt, the catalog's 1 Pt upper study. These bounds keep future model calculations within a defined range. Group separators must divide three digits consistently; malformed text cannot resolve to a device profile and must not launch.

## Scenario framing — Plan 03

The camera estimates the prototype's light-effect radius as 4.8 km times the cube root of yield divided by 0.01 Mt, bounded to less than the antipodal surface distance. Its framing horizon is 1.08 times that radius for a single device or three times for a MIRV, subject to the same surface cap. The renderer converts this distance to a zoom using viewport dimensions and latitude. This estimate positions the camera; it is not a forecast or a rendered blast model.

## Incoming missile — Plan 04

The incoming path is a visual reconstruction of `prototype-code/app/missile-flight.mjs`, not a ballistic trajectory or travel-time prediction. At launch, the camera supplies a viewport-edge start and one bent control point; all three are stored as geographic coordinates. The renderer samples a quadratic curve with progress raised to 1.16 over 6.5 seconds, then projects it through the current camera. Longitudes use the shortest antimeridian arc. Smoke emission points stay on this route; their decorative CSS-pixel drift is damped over 0.22 seconds and fades within 3 seconds. None of these screen-space optical choices changes physical distance or future effect calculations. The fixed upper-right entry angle makes the staged animation reproducible; changing it later can preserve the same route contract.
