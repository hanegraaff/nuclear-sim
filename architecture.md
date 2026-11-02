# Nuke Simulator architecture

## Decision and goals

Build a client-side TypeScript application with React, Vite, MapLibre GL JS, Canvas 2D for fields and missile effects, and a small MapLibre-aligned WebGL custom layer for the ground-anchored fireball. Use strict TypeScript, ESLint, Vitest, React Testing Library, and Playwright. Publish the Vite static build as a Site; the hosted URL is the user-facing application. No server, database, authentication, or API is needed for the specified behavior. Preserve visible imagery attribution. Pin dependency versions in a lockfile when implementation begins.

This stack matches the prototype's core rendering primitives while making the numerical model and application state testable outside the browser. Vite's React/TypeScript template, MapLibre raster/custom layers, Vitest's Vite integration, and Playwright's screenshot assertions are supported by their [official Vite guide](https://vite.dev/guide/), [MapLibre raster example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-raster-tile-source/), [MapLibre custom-layer examples](https://maplibre.org/maplibre-gl-js/docs/examples/), [Vitest configuration guide](https://vitest.dev/config/), and [Playwright visual testing guide](https://playwright.dev/docs/test-snapshots).

## Dependency rule

```text
catalog data ──> domain model ──> application state ──> React UI
                    │                    │
                    └── effect results ──┴──> rendering adapters ──> MapLibre / Canvas / WebGL
```

`domain` imports only domain types and standard TypeScript/JavaScript utilities. `application` imports domain types and functions, but never MapLibre or a renderer. `rendering` consumes immutable effect results and camera state; it never owns yield formulas or scenario selection. `ui` owns controls and accessibility, and dispatches semantic actions to application state. The infrastructure map adapter translates between geographic coordinates and MapLibre camera/projected pixels. A renderer may be replaced without changing model tests; a model may be recalibrated without rewriting drawing code.

## Proposed organization

```text
site/                isolated Sites source checkout and static build project
  .openai/hosting.json  Site identity and static dist/ configuration
  src/
    catalog/        device and scenario data, lookup and validation
    domain/         units, geodesy, blast, fallout, audible/visible, cloud models
    application/    simulator reducer/state machine, clock, launch sequencing
    rendering/
      map/          MapLibre setup, raster imagery, attribution, camera adapter
      effects/      blast/fallout/range field layers and composition
      animation/    missile, smoke, flash, shockwave, fireball, cloud profile
      overlays/     ruler, markers, legends, viewport placement
    ui/             React shell, controls, view tabs, tooltips, responsive styles
    main.tsx
  tests/
    unit/           catalog, domain, state machine, animation geometry
    integration/    model-to-render data, camera alignment, canvas contracts
    e2e/            user journeys and deterministic visual snapshots
  docs/
    model.md        equations, calibration, provenance, limitations
    visual-reference.md  image-to-state mapping and deliberate visual differences
```

Each logical source area and `site/tests/` has a README as described in `AGENTS.md`. The root README covers setup, commands, controls, and architecture. Root `package.json` forwards verification commands into `site/`. Keep test fixtures outside `prototype-code/` and `prototype-screenshots/`.

## Sites delivery

Plan 01 creates a new Site with a private audience, stores its returned `project_id` in the tracked `site/.openai/hosting.json` manifest, and configures `dist/` as the static directory. The Sites source workflow packages the verified build, saves a version, and deploys it. Preserve the same `project_id` and audience for subsequent plans. Keep provider credentials out of source, command arguments, and documentation.

Each roadmap plan ends with the appropriate Sites source sync, version save, and deployment after tests and build pass. A plan is complete only when the deployment reaches a successful terminal state and its URL and version are recorded in the roadmap. Validate the hosted result's visible path for that plan; automated browser tests may use a local deterministic fixture to avoid live-tile variability. Local commands and previews are engineering tools, not the way users receive the application. The root README should link directly to the live Site once Plan 01 publishes it.

## Domain model

Use named types or branded units for `Kilometers`, `Megatons`, `Degrees`, `Milliseconds`, `GeoPoint`, `DeviceProfile`, `Strike`, `BlastRadii`, `FalloutFootprint`, `RangeField`, and `EffectBand`. Validate finite, positive yields and valid latitude/longitude at the input boundary. Keep calculation results immutable. Use seeded randomness only for decorative noise; the physical output for a given input is deterministic.

The first implementation should reproduce the prototype's representative scale, then document any deliberate calibration changes in `docs/model.md`:

- **Geodesy:** use Earth radius 6371 km, great-circle distance, and geographic destination formulas. Cap a surface range below the antipodal distance. Use camera projection only after modeling geographic geometry.
- **Blast:** begin with cube-root yield scaling against a 10 kt reference. The prototype's reference radii at 10 kt are approximately 0.14 km fireball, 0.8 km severe, 1.6 km moderate, and 4.8 km light; its fireball uses a slightly different exponent. Use the visual reference and documented model assumptions to decide final constants. Return ordered band boundaries and area estimates. Treat conventional devices as non-nuclear.
- **MIRV:** store aggregate display yield and per-warhead yield separately. Model each impact at the per-warhead yield and generate a deterministic spread around the clicked aim point; use one shared carrier route before separation.
- **Fallout:** use a location-based prevailing-wind proxy with equatorial, trade-wind, westerly, and polar bands, deterministic small variation, and a second surface-wind bearing. Produce a curved downwind H+24 envelope plus local deposition, then derive four nested bands. Label the result a screening proxy, never live weather or an actual dose measurement.
- **Audible:** use a bounded yield-scaled outdoor sound range, separate from structural blast zones. The prototype's baseline is approximately `155 × yieldMt^0.32` km with a small burst-height term. Treat the decibel descriptions as illustrative experience bands.
- **Visible:** calculate a direct-fireball horizon using Earth curvature, burst height plus fireball height, and 1.7 m observer eye height. Do not substitute mushroom-cloud visibility.
- **Cloud:** estimate a peak plume height from per-warhead yield and burst height, then provide a normalized growth curve to the monitor. Distinguish nuclear and conventional profiles.
- **Overlap:** combine per-strike field intensities with a commutative, bounded function. Keep each strike's original parameters for inspection and legend semantics.

Model output contains geometry and intensity in geographic/physical units. It does not contain Canvas contexts, DOM nodes, CSS colors, or MapLibre objects. Rendering owns the palettes and optical effects, while the band names/meaning are shared read-only presentation data.

## Application state and timing

Represent `armed`, `inbound`, `detonating`, and `complete` as explicit phases. The application store/reducer owns selected device/scenario, target(s), launch mode, launch groups, effect view, map tone, panel visibility, and active/pinned marker. Commands include `selectDevice`, `selectScenario`, `launchAt`, `setMultiLaunch`, `setEffectView`, `reset`, `setMapTone`, and `setPanelsVisible`. Events use an injected monotonic clock and scheduled frame callback so tests can advance time precisely.

Normal timing targets are 6500 ms for flight, about 1100 ms for the impact flash, and 4600 ms for blast expansion. The trajectory uses a viewport-edge start and gently curved carrier route. A MIRV splits around 60% of carrier flight with position and velocity continuity. Smoke remains at its emission coordinates, grows and fades over time, and stays within a fixed per-frame draw budget. Reduced-motion mode shortens flight and simplifies flash/smoke while reaching the same final modeled state.

One launch group represents one click. Single mode replaces the existing group, even during animation. Multi mode appends new groups and renders overlapping fields. Disabling multi mode keeps the most recent whole group. Reset invalidates pending frame work and render caches, clears strikes and inspection state, and returns to armed without changing device, camera, or launch-mode selection. Scenario selection changes device and camera but does not create a strike.

## Rendering and camera alignment

Keep MapLibre as the camera and imagery owner. Use a raster satellite style with source attribution, a day/night tone adjustment, navigation controls, and camera padding that respects the left panel. Render effects in a defined layer order: imagery and tone, blast/fallout/range field, fireball, missile/flash, rulers and markers, legends and controls. The canvas layers are transparent and do not intercept map clicks. Capture camera transform once per frame and project all overlays from the same transform.

The UI mounts a rendering-owned map controller and receives readiness and camera snapshots through callbacks; it does not hold a MapLibre map. The controller exposes narrow operations such as imagery retry and disposal. Scope tile failures to the imagery source and refresh its tiles without replacing the whole style, so recovery preserves future effect layers. A later successfully loaded tile clears the failure notice; MapLibre's idle event marks the imagery ready after visible tiles finish loading.

For top-down views, use a geographic effect field sampled into an image/canvas. For pitched views, project or mesh the ground field so circles and plumes lie on the map plane. Cache settled fields and invalidate on changed strike set, view, projection, viewport size, or model input. Reproject a valid cache during pan/zoom; never reuse a stale image after a view switch or Reset. Use a separate rendering budget for dense multi launches. Keep missile route geographic once established so panning/zooming does not teleport it.

The fireball is an illustrative ground-anchored hemisphere. Its geographic radius uses the modeled fireball radius, and its visible growth follows the arriving blast front. If WebGL cannot initialize, preserve the 2D flash and effect field, with a graceful warning only in developer diagnostics. A deterministic local imagery fixture is used for tests; the live app retains provider attribution and handles unavailable tiles without covering the UI.

## UI and accessibility

React components subscribe to application state and dispatch semantic commands. Keep them free of physical formulas and canvas loops. Use CSS variables for the prototype palette and compact typography. Preserve the clipped black control panel, separate cloud monitor, upper-right view switcher, bottom-left multi legends, map markers, dashed single ruler, and lower-edge model qualification. Position tooltips within the viewport. Expose controls as labeled buttons/selects, support hover and focus on markers, keep pressed/selected state in ARIA attributes, announce launch phase/status, and honor `prefers-reduced-motion`.

## Test strategy and enforceable acceptance

1. **Unit tests are the primary gate.** Vitest covers all catalog entries, numeric invariants, representative calibration cases, geodesic edge cases, deterministic wind, per-warhead MIRV behavior, state transitions under fake time, and continuity/decay of missile and smoke. Prefer property-style tables over tests that merely repeat a function's implementation.
2. **Integration tests** use fake camera/projection and canvas adapters to verify overlay location, projection changes, cache invalidation, marker eligibility, and palette/legend consistency. These tests do not request live imagery.
3. **Browser tests** use Playwright and a fixed local tile fixture for essential user flows and viewport coverage. Freeze time, animation progress, launch angle, fonts, and device pixel ratio for screenshot states. Compare newly approved implementation baselines in CI; use the supplied prototype images as the human-reviewed target when creating those baselines. Do not demand pixel equality with live Esri tiles or a different browser/GPU. Playwright's [visual comparison guidance](https://playwright.dev/docs/test-snapshots) notes that browser environments affect results.
4. **Commands:** implement `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run build`, and `npm run verify` (all required checks). CI runs `npm run verify` from a clean install. A feature is complete only when its relevant tests and the full gate pass and the verified Site update is deployed.
5. **Visual review:** inspect fixed-time frames for missile, impact, expansion, and settled states, plus all effect views and single/multi presentations. Record any approved mismatch in `docs/visual-reference.md` with the requirement ID and screenshot filename.

Avoid an arbitrary total coverage percentage as a substitute for behavior tests. New domain and application branches must have meaningful tests, and `npm run verify` must fail when any required test fails.
