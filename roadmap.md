# Nuke Simulator roadmap

This is the working plan for rebuilding the read-only prototype as a maintainable application published through Sites. It is for people reviewing and implementing the work. Read it with [requirements.md](requirements.md), [architecture.md](architecture.md), and [AGENTS.md](AGENTS.md). Each completed plan publishes a visible change to the same Site, which the user can inspect in a browser without running the application locally.

## How to use this document

- **Status values:** `Ready` means work can start; `Not started` means a preceding plan has not finished; `In progress` means implementation is underway; `Blocked` means a named decision or external condition prevents useful progress; `Complete` means the plan's experience, tests, documentation, visual review, and Site deployment are finished.
- **One plan at a time:** implement the listed capability as one coherent change. Keep the hosted Site working between plans. If a plan proves too large, split it here before implementing part of it. Do not mark a partial plan complete.
- **Closeout:** run the checks available for that stage, publish the verified build to the existing Site, confirm the deployment succeeded, then update status, completion date, Site version and URL, and review evidence below. Record approved deviations in `docs/visual-reference.md`. Once Plan 01 establishes `npm run verify`, every later plan must keep it passing.
- **Visual evidence:** compare the relevant state at a fixed camera, viewport, device, animation time, and tile fixture. The supplied captures in `prototype-screenshots/` are the human visual target. Automated snapshots should use a controlled browser environment and reviewed implementation baselines.
- **Delivery:** Plan 01 creates and publishes a private Site. Later plans update that same Site and preserve its audience. GitHub is the source of truth; [Sites publishing](docs/sites-publishing.md) uses a temporary release checkout from a pushed GitHub commit. The Site URL is the user-facing way to review progress. Local execution remains available for development and automated tests only.
- **Decisioning:** a dependency on an earlier plan is not a design blocker. If a real decision emerges, write the options, the recommended choice, the owner, and the effect on later plans under the plan's “Blocking decisioning” field. Continue work that does not depend on that decision.

The roadmap is current as of **2026-11-03**. Plans 01–07 are published to the same private Site. The prototype directories remain read only.

| Plan | Visible increment | Status | Depends on |
| --- | --- | --- | --- |
| 01 | Published full-screen satellite map | Complete | — |
| 02 | Device control panel | Complete | 01 |
| 03 | Scenario navigation | Complete | 02 |
| 04 | Target and incoming missile | Complete | 03 |
| 05 | Single blast animation | Complete | 04 |
| 06 | Blast ruler and inspection markers | Complete | 05 |
| 07 | Blast field grounded in pitched views | Complete | 06 |
| 08 | 3D fireball | Ready | 07 |
| 09 | Animated cloud-profile monitor | Not started | 08 |
| 10 | Additive multi launch | Not started | 09 |
| 11 | MIRV separation and multiple impacts | Not started | 10 |
| 12 | Fallout view | Not started | 11 |
| 13 | Audible view | Not started | 12 |
| 14 | Visible view | Not started | 13 |
| 15 | Night map and hide/show controls | Not started | 14 |
| 16 | Narrow-screen layout | Not started | 15 |
| 17 | Reduced motion and final review | Not started | 16 |

## Plan 01 — Published satellite map

**Capability description.** Establish the production application shell and publish the map at the prototype's initial New York location. This is the foundation for every later visual layer and the first hosted release. Covers the first part of R-01, M-01, and R-14.

**Implementation details.** Create the Vite/React/strict-TypeScript project in `site/`, outside the prototype folders. Add MapLibre with a satellite raster source, visible attribution, the initial center/zoom, zoom controls, a targeting cursor, and a map-loading/error state. Create the source-area READMEs, root scripts, basic CI-ready `npm run verify`, and a fixed tile fixture for browser tests. Add a geographic point/distance module and a camera adapter with unit tests. Build static output in `site/dist/`, create a new private Site using the Sites workflow, record its returned project ID in `site/.openai/hosting.json`, and publish the verified first version. Add the Site URL to `README.md`. Do not add a large state framework or a backend.

**What the user will experience.** Opening the published Site URL shows a full-viewport satellite map centered on Manhattan. The user can pan and zoom, and sees imagery attribution and navigation controls.

**Completion evidence.** `npm run verify` passes; a browser smoke test shows a full-viewport map, initial framing, pan/zoom, and a useful tile-failure state. The private Site deployment succeeds, its URL opens the map, and the Site version and desktop screenshot are recorded.

**Current status.** Complete on 2026-11-01. Site version 3 is published privately after the architecture review fixes. Type checking, lint, three unit tests, five integration tests, the production build, and three browser checks pass. The browser check asserts the initial camera and compares the [2208 × 1276 fixed-tile capture](site/docs/plan-01-map-test.png) with a reviewed baseline. An authenticated production-browser check returned HTTP 200 and confirmed the initial camera, zoom controls, attribution, and a fully loaded [2208 × 1276 hosted capture](docs/plan-01-hosted-v3.png).

**Blocking decisioning.** None known. Use the prototype imagery source with attribution initially. If hosting requirements prevent that source, record the replacement decision and its visual impact before publishing.

## Plan 02 — Device controls and catalog

**Capability description.** Give the map its compact upper-left control panel and the complete Device selector. Covers R-02 and R-03.

**Implementation details.** Build the clipped dark panel, coral title, subtitle, Device tab, grouped selector, and concise status text. Move all 47 prototype devices into typed catalog data with IDs, numeric and displayed yields, and explicit per-warhead values for MIRV entries. Add a custom megaton input with finite positive validation. Introduce application state for the current selection; keep React limited to controls and display. Add catalog parity tests for every entry and a browser test for selection and validation. Only show actions that have working behavior at this stage.

**What the user will experience.** The map gains the prototype-style control panel. Fat Man · 21 kt is selected initially, and choosing another device or custom yield visibly updates the selection and status.

**Completion evidence.** Catalog and input tests pass; the selected item remains correct after a page interaction. Compare panel shape, spacing, typography, and device list with `Nuke Blast Top.png`.

**Current status.** Complete on 2026-11-01. Site version 5 is published privately from source commit `ec8857f289838ae0cdd66f2bf1267e18bacc2e4b` after a Plan 02 validation review. The full gate passed: type checking, lint, 82 unit tests, 5 integration tests, the production build, and 5 browser tests. The [fixed-tile panel baseline](site/tests/e2e/device-panel.spec.ts-snapshots/plan-02-device-panel-reference-darwin.png) was reviewed against `Nuke Blast Top.png`; the [hosted panel capture](docs/plan-02-hosted.png) records the original version 4 appearance. An authenticated version 5 browser check confirmed HTTP 200, the ready map, rejection of `1e-323` and `1,5`, acceptance of `1,000` and the 0.000000001 Mt lower bound, and no browser errors. Staged panel differences are documented in [visual reference notes](site/docs/visual-reference.md).

**Blocking decisioning.** None. Preserve prototype catalog labels and ordering; document any corrected historical data separately rather than silently changing the visual catalog.

## Plan 03 — Scenario selection and camera movement

**Capability description.** Let users choose a historical or hypothetical scenario and move the map to its location. Covers R-04.

**Implementation details.** Add the Scenario tab and its 20 entries, grouped exactly as in the prototype. Store scenario ID, location, and associated device in catalog data. Selecting an entry changes the device and eases the camera to a zoom appropriate to its modeled scale; it must not launch automatically. Test all mappings and locations, the camera command, and switching between Scenario and Device. Keep selection state independent of map rendering.

**What the user will experience.** Choosing Hiroshima, Trinity, or another scenario visibly flies the map to that place and prepares the associated device. They can still freely choose a different map target afterward.

**Completion evidence.** All scenario parity tests pass; a browser test verifies selection, map movement, and absence of an automatic strike. Compare the control tabs and dropdown with the prototype panel.

**Current status.** Complete on 2026-11-01; review fixes were published on 2026-11-02 as private Site version 7 from source commit `7b7fd11b87d3efc7485f8ed671630c2e6b738440`. The full gate passed: type checking, lint, 106 unit tests, 7 integration tests, build, and 8 browser tests. All 20 scenarios and their device/coordinate mappings are covered. The [Scenario tab baseline](site/tests/e2e/device-panel.spec.ts-snapshots/plan-03-scenario-panel-darwin.png) and [Device tab baseline](site/tests/e2e/device-panel.spec.ts-snapshots/plan-03-device-panel-darwin.png) were reviewed against `Nuke Blast Top.png`; the [hosted Hiroshima view](docs/plan-03-hosted-hiroshima.png) records version 6. An authenticated version 7 browser check held destination tiles to confirm loading and readiness, and verified that an invalid custom draft and its error return on the Device tab.

**Release workflow update.** On 2026-11-02, version 7 was redeployed successfully from a temporary Sites checkout whose source tree matched GitHub commit `e1e47da33c87867f9abf2c1218adf48f8f5c11be`; Sites reused source commit `7b7fd11b87d3efc7485f8ed671630c2e6b738440`. A clean install and the full verification gate passed in that checkout: 106 unit, 7 integration, and 8 browser tests, plus type checking, lint, and build. An authenticated hosted check confirmed the map, scenario navigation, device selection, and custom-yield validation. The workspace uses only the root GitHub repository.

**Blocking decisioning.** None. Use the scenario coordinates and device mappings in `prototype-code/app/page.tsx`.

## Plan 04 — Targeting and incoming missile

**Capability description.** Make a map click produce the prototype's red crosshair and incoming missile. This is the highest-priority motion match. Covers R-05 and V-01.

**Implementation details.** Add a launch command and phase clock. Convert the click to a geographic target; draw a pulsing reticle immediately. Start the missile at a visible viewport edge, follow a gentle curve for about 6.5 seconds, and draw the small white/amber core, orange halo, and thin pale smoke trail. Store the route in geographic coordinates after launch so camera movement cannot teleport it. Use injected time and launch angle for deterministic tests. Stop control clicks from reaching map launch handling. Add unit tests for route endpoints, continuity, smoke drift/decay, and cancellation; add a fixed-time browser capture.

**What the user will experience.** A click places a bright red target and a visible missile flies toward it, leaving a fading trail. Panning the map does not detach the target or the missile path.

**Completion evidence.** The missile arrives at the chosen target; target and missile stay aligned through pan/zoom; the fixed-time capture is reviewed against `Missile.jpeg`.

**Current status.** Implemented and published on 2026-11-02 from branch `plan-4`. Four review findings were fixed and republished as private Site version 9. The application store now owns frame scheduling; the renderer projects the route before evaluating its curve, varies the entry angle by launch, and gives adjacent smoke puffs independent motion. Type checking, lint, 117 unit tests, 9 integration tests, build, and 12 browser tests passed from a clean install. An authenticated hosted check confirmed HTTP 200, ready imagery, an inbound launch, a painted target, and no page errors. The [3200 ms fixed-tile frame](site/tests/e2e/missile.spec.ts-snapshots/plan-04-missile-3200ms-darwin.png) was inspected against `Missile.jpeg`; the staged differences are recorded in [visual reference notes](site/docs/visual-reference.md).

**Blocking decisioning.** None. The prototype's path, light, and smoke behavior take precedence over a physically realistic ballistic trajectory.

## Plan 05 — First complete single blast

**Capability description.** Turn the arrival into an impact flash and expanding blast, then leave one settled effect on the map. Covers R-06, R-08, V-02, and M-02.

**Implementation details.** Add pure blast-radius and zone calculations in kilometers, calibrated to representative prototype yields. Drive phase transitions from inbound to detonating to complete. Draw the 1.1-second warm flash, shockwave, and roughly 4.6-second expanding radial field with the prototype easing and translucent purple-to-white palette. Keep the effect centered in geography as the map moves. A new click in single mode cancels and replaces the prior strike, including active animation. Add the working Reset control, which clears effects and returns to armed without resetting camera or device. Test radius ordering/monotonicity, representative yields, fake-clock transitions, replacement, and Reset.

**What the user will experience.** The missile now detonates: the screen flashes, a circular field expands, and one lasting blast remains. A second click replaces it; Reset clears it.

**Completion evidence.** Model and state tests pass; fixed-time screenshots show impact, mid-expansion, and final field. Compare with `Nuke Blast with Fireball.png` and `Nuke Blast Top.png`, noting that the 3D dome arrives in Plan 08.

**Current status.** Complete on 2026-11-02 from branch `plan-5`; both PR review findings were fixed and the brighter center was published to the existing private Site as version 11. A clean-install release checkout passed type checking, lint, 124 unit tests, 13 integration tests, build, and 16 browser tests. Authenticated hosted Chromium returned HTTP 200, reached a ready map, completed a strike with a white-hot center pixel, and reported no page errors. The revised [50 ms impact](site/tests/e2e/blast.spec.ts-snapshots/plan-05-impact-50ms-darwin.png), [2300 ms expansion](site/tests/e2e/blast.spec.ts-snapshots/plan-05-expansion-2300ms-darwin.png), and [settled field](site/tests/e2e/blast.spec.ts-snapshots/plan-05-settled-darwin.png) were inspected against the prototype references; staged differences are recorded in [visual reference notes](site/docs/visual-reference.md).

**Blocking decisioning.** None. Keep physical constants documented in `docs/model.md`; changes must preserve the nested zone order and visible scale.

## Plan 06 — Blast measurement and inspection

**Capability description.** Complete the settled single-strike presentation with zone boundaries, a ruler, markers, and popups. Covers the rest of R-06, R-11, and V-03.

**Implementation details.** Derive four bands from the model and draw their ground-anchored boundary strokes. Add the white dashed radius ruler, endpoint label, and four colored circular markers. Show descriptions, spans, and areas in the dark tooltip on hover, focus, or click; position it inside the viewport. Add keyboard and ARIA behavior. Test band geometry/area and marker placement under camera movement, plus a browser interaction test.

**What the user will experience.** Once a blast settles, the user can read its radius and explore Light, Moderate, Severe, and Fireball zones. Hovering or focusing a marker reveals a detailed black popup.

**Completion evidence.** Model and placement tests pass; a desktop capture is reviewed against `Nuke Blast Top.png` and `MarkersAnd Popups.jpeg`.

**Current status.** Complete on 2026-11-02 from branch `plan-6`, with user-testing corrections published as private [Site version 13](https://nuke-simulator-rebuild.maquaman.chatgpt.site). Its exact application source is GitHub commit `8e290f95a9b5d78192b7426e826177d47ecfeca8` and Sites source commit `eb365f205946b0096c12025c8b0e6aa575eaeac9`. The ruler direction is fixed for each settled strike, marker rings share the ruler's canvas frame, and four crossing glare lines were removed while retaining the white-hot center. The full gate passed in the workspace and a clean release checkout: type checking, lint, 128 unit tests, 17 integration tests, build, and 21 browser tests. The fixed-tile [settled measurement](site/tests/e2e/blast-inspection.spec.ts-snapshots/plan-06-settled-darwin.png), [Light popup](site/tests/e2e/blast-inspection.spec.ts-snapshots/plan-06-light-tooltip-darwin.png), impact, and expansion frames were inspected against `Nuke Blast Top.png` and `MarkersAnd Popups.jpeg` before their baselines were refreshed. An authenticated hosted Chromium check of version 13 returned HTTP 200, completed a strike, found four markers, opened the Light tooltip with 105.5 km², and reported no page errors. Remaining staged visual differences are recorded in [visual reference notes](site/docs/visual-reference.md).

**Blocking decisioning.** None. Choose the ruler bearing once at settlement so zoom and pan cannot flip its direction for that strike.

## Plan 07 — Grounded effects in pitched views

**Capability description.** Make the blast field and its inspection tools lie on the map in angled views. Covers pitched R-01 and V-03.

**Implementation details.** Project or mesh the blast field onto the map plane when pitched; keep boundaries, ruler, and markers tied to the same camera frame. Preserve the top-down appearance. Test top-down/pitched projection invariants and resize/pan/zoom alignment. Add fixed camera captures for top-down and angled views.

**What the user will experience.** Tilting the map makes the blast and its measurement markers lie on the terrain instead of appearing as a flat screen circle.

**Completion evidence.** Camera alignment tests pass and browser captures are reviewed against the ground fields in `Nuke Blast with Fireball.png` and `Nuke Blast Top.png`.

**Current status.** Complete on 2026-11-03 from branch `plan-7`, published as private [Site version 14](https://nuke-simulator-rebuild.maquaman.chatgpt.site). The geographic blast field, white-hot ground light, ruler, and markers remain attached to the map while pitching, bearing, panning, zooming, and resizing. Overhead appearance retains its Plan 06 baseline. The full gate passed in the workspace and a clean release checkout: type checking, lint, 130 unit tests, 19 integration tests, production build, and 24 browser tests. Fixed-tile [overhead](site/tests/e2e/pitched-blast.spec.ts-snapshots/plan-07-top-down-darwin.png), [pitched settled](site/tests/e2e/pitched-blast.spec.ts-snapshots/plan-07-pitched-darwin.png), and [pitched expansion](site/tests/e2e/pitched-blast.spec.ts-snapshots/plan-07-pitched-expansion-darwin.png) captures, plus launch and impact frames, were inspected against `Nuke Blast Top.png` and `Nuke Blast with Fireball.png`. The authenticated hosted Chromium check returned HTTP 200, reached a 60° camera pitch, completed a strike with four inspection markers, and reported no page errors. GitHub application source is commit `5d99380f0ceedf950113fa1df3fcf5d4f5fb5a80`; Sites source is commit `65f494af38a9a5d95776fb5a71aa84a57b9faba1`.

**Blocking decisioning.** None. Keep geographic distance in the model; camera projection belongs to rendering.

## Plan 08 — 3D fireball

**Capability description.** Add the bright ground-anchored dome at the center of the blast. Covers V-02 and the fireball part of V-03.

**Implementation details.** Add the small WebGL custom layer for a textured hemisphere. Its radius comes from the physical model, and its growth follows the advancing blast front. Keep the 2D field and flash usable if WebGL initialization fails. Test fireball growth bounds, geographic scale, and alignment during pan/zoom/pitch. Capture the dome at early and settled phases.

**What the user will experience.** At impact, a glowing fireball rises from ground zero and stays attached to the terrain in angled views.

**Completion evidence.** Fireball geometry and fallback tests pass; compare angled captures with `Nuke Blast with Fireball.png`.

**Current status.** Ready; Plan 07 is complete.

**Blocking decisioning.** None. The architecture selects WebGL with a 2D fallback. If a supported browser cannot sustain the dome, record the measured constraint and proposed visual compromise before changing the design.

## Plan 09 — Cloud-profile instrument

**Capability description.** Add the separate animated cloud monitor shown under the controls. Covers R-12 and V-08.

**Implementation details.** Model peak cloud/plume height and a normalized growth curve from per-warhead yield. Render the dark monitor, scale, smoky silhouette, amber height readout, and phase footer. Synchronize its growth with the blast timeline; Reset returns it to standby. Distinguish nuclear mushroom cloud from conventional plume and mark MIRV heights as per-warhead. Test height bounds, growth monotonicity, state synchronization, and Reset. Keep the monitor renderer independent of the map.

**What the user will experience.** A second instrument panel appears. It animates during detonation and then displays the modeled peak height, matching the prototype's left-side composition.

**Completion evidence.** Cloud model and fake-time tests pass; compare standby, growing, and settled captures with the cloud panel in `Nuke Blast with Fireball.png`.

**Current status.** Not started; depends on Plan 08.

**Blocking decisioning.** None. Use an illustrative model and label its limits in `docs/model.md`.

## Plan 10 — Additive multi launch

**Capability description.** Let several map clicks create overlapping strikes and the prototype's combined-effect presentation. Covers R-07, V-04, and M-06.

**Implementation details.** Add the Multi-Launch Mode toggle and store each click as a separate launch group. Allow new missiles while earlier groups animate; combine intensities with a bounded, order-independent function. Remove the single ruler/dividing rings in multi mode and show the lower-left map-distance scale and four-band effect legend with hover/focus popups. Toggling the mode changes presentation immediately. Turning it off retains the newest whole group; Reset clears all groups. Add overlap, order, mode-switch, and cache-invalidation tests. Keep dense-frame work bounded.

**What the user will experience.** They can create several persistent impacts. Where blast fields overlap, the map glows more intensely. The panel says Multi-Launch Mode ON, and the lower-left scale/legend replaces the single-strike ruler.

**Completion evidence.** State and composition tests pass; inspect two, five, and dense overlapping strikes and compare the five-strike state with `Multi-Launch.png`.

**Current status.** Not started; depends on Plan 09.

**Blocking decisioning.** None. Do not combine multiple strikes by adding their yields into a single virtual device.

## Plan 11 — MIRV carrier and separation

**Capability description.** Make the three prototype MIRV entries deliver their listed number of warheads from one shared carrier. Covers R-03, R-07, and M-03.

**Implementation details.** Use the catalog's per-warhead yields and deterministic target spread. Draw one carrier before separation at about 60% of its flight, then smoothly branch into individual trails and impacts without a position or velocity jump. Keep a MIRV click as one launch group for mode switching and Reset. Show impact count and per-warhead cloud wording. Test target count, per-warhead radius, path continuity, grouped retention, and a browser launch.

**What the user will experience.** Selecting a MIRV system produces one incoming missile that splits into several visible warheads and distinct blasts. The effect scale reflects each warhead rather than the aggregate displayed yield.

**Completion evidence.** Continuity and catalog tests pass; a fixed-time capture shows pre-split, split, and multiple impacts.

**Current status.** Not started; depends on Plan 10.

**Blocking decisioning.** None. Use the representative modeled loadouts in the prototype, visibly labeled as modeled.

## Plan 12 — Fallout view

**Capability description.** Add the post-detonation pink Fallout tab and the long H+24 downwind plume. Covers R-10, R-11, V-05, and M-04.

**Implementation details.** Implement a deterministic location-based wind proxy, local deposition, curved plume geometry, and four nested dose-screening bands in the pure domain model. Render the irregular yellow/orange-to-pink/purple field, downwind dashed ruler, H+24 endpoint label, markers, and tooltips. Reframe the camera to show the plume. Show the tab only when a nuclear strike is available; include the prototype's “not live meteorology” qualification. Add wind reproducibility, geometry, eligibility, camera-alignment, and view-switch tests.

**What the user will experience.** After a nuclear launch settles, choosing Fallout replaces circular blast bands with a long plume that follows a modeled prevailing wind. The user can inspect four downwind bands.

**Completion evidence.** Model and view tests pass; compare a pitched New York capture with `Fallout.png`.

**Current status.** Not started; depends on Plan 11.

**Blocking decisioning.** None. The architecture commits to a climatological proxy; live weather is outside this roadmap.

## Plan 13 — Audible view

**Capability description.** Add the green outdoor audible-range view with smooth falloff and inspection bands. Covers R-10, R-11, V-06, and the audible part of M-05.

**Implementation details.** Model a bounded audible radius separately from blast damage. Render a continuous dark-green-to-mint field without hard ring borders, plus single-mode ruler/markers and multi-mode legend with Faint, Loud, Painful, and Deafening descriptions. Handle overlapping audible fields with the same bounded composition contract. Add range monotonicity, palette continuity, overlap, marker, and browser view-switch tests. Show the weather/terrain qualification.

**What the user will experience.** The map turns green around the impacts when Audible is selected. Hovering or focusing an inspection point explains the expected sound experience; overlapping launches intensify the green field.

**Completion evidence.** Range and rendering tests pass; compare the multi-mode green state with the selected Audible tab in `Additive Blasts.png`. Do not use `Audible.png` as the green target because it shows Blast selected.

**Current status.** Not started; depends on Plan 12.

**Blocking decisioning.** None. Decibel descriptions remain illustrative rather than precise predictions.

## Plan 14 — Visible view

**Capability description.** Add the blue direct-fireball visibility view. Covers R-10, R-11, V-07, and the visible part of M-05.

**Implementation details.** Calculate the direct line-of-sight horizon from burst height, fireball size, Earth curvature, and a 1.7 m observer. Render the soft white/sky-blue/navy field, single-mode radius and markers, and multi-mode legend with Faint, Clear, Brilliant, and Blinding descriptions. Reframe the camera for the longer range, keep pitched geometry aligned, and include the clear-air qualification. Test horizon calculations, yield bounds, palette continuity, overlap, and view switching.

**What the user will experience.** Choosing Visible gives the map a broad blue glow with a labeled visibility distance and explainable bands. Switching back to Blast restores the original settled field.

**Completion evidence.** Domain and browser tests pass; compare with `Vsible.png` (the prototype's filename spelling).

**Current status.** Not started; depends on Plan 13.

**Blocking decisioning.** None. Model direct fireball visibility, not the later cloud or scattered glow.

## Plan 15 — Night imagery and panel visibility

**Capability description.** Complete the prototype's Night and Hide/Show controls. Covers R-09 and the remaining controls in R-02.

**Implementation details.** Add a night tone that changes the satellite raster treatment without changing model results, overlays, or attribution. Add Hide to move the left control stack away and a small Show Controls button to restore it. Preserve strike state, effect view, and map interaction during both changes. Test state persistence, camera/overlay alignment, keyboard operation, and no accidental launches from control clicks.

**What the user will experience.** Night darkens the map while effects remain in place. Hide reveals more of the satellite image, and Show Controls restores the panels without losing the current simulation.

**Completion evidence.** State/browser tests pass; capture day/night and shown/hidden states at the same camera and strike.

**Current status.** Not started; depends on Plan 14.

**Blocking decisioning.** None. Keep the prototype's night treatment and ensure text contrast remains usable.

## Plan 16 — Narrow screens

**Capability description.** Make the complete simulator usable on narrow screens. Covers the responsive part of R-13.

**Implementation details.** Adapt panel width, cloud monitor, view selector, legends, tooltips, map padding, and navigation controls for narrow viewports. Keep the map launchable while the panels are shown. Add narrow-viewport browser paths for selection, launch, marker inspection, view switching, multi launch, hide/show, and Reset. Tune mobile spacing and tooltip placement without changing the desktop design.

**What the user will experience.** The full simulator fits a phone-sized screen, and every essential action remains usable.

**Completion evidence.** Narrow-viewport browser tests and `npm run verify` pass. Capture the controls, launch, tooltips, and each effect view at a fixed phone-sized viewport.

**Current status.** Not started; depends on Plan 15.

**Blocking decisioning.** None. Follow the prototype's compact layout behavior while keeping touch targets and tooltips operable.

## Plan 17 — Reduced motion and final visual review

**Capability description.** Finish the accessible motion option and review the complete application against the prototype. Covers the remaining part of R-13 and final fidelity for all V requirements.

**Implementation details.** Honor `prefers-reduced-motion` with a shorter, less intense launch sequence that reaches the same final effect. Complete keyboard focus and ARIA status behavior. Review all named screenshot states at fixed time and camera; tune spacing, color, opacity, glow, and rendering budgets where the implementation still differs. Ensure the README links to the Site and explains controls, model limits, imagery attribution, engineering test commands, and the roadmap. Update `docs/model.md` and `docs/visual-reference.md` with final assumptions and any approved differences.

**What the user will experience.** Users who request less motion get a shorter, calmer sequence with the same final map. Keyboard users can complete the main workflow. Desktop and pitched views more closely match the supplied prototype.

**Completion evidence.** Full `npm run verify` passes from a clean install, the final Site version deploys successfully, and its URL opens the completed simulator. Desktop 2208 × 1276 and a narrow viewport complete the launch, inspection, view-switch, multi-launch, hide/show, and Reset paths. Inspect incoming, impact, expansion, settled, Fallout, Audible, Visible, and multi-strike captures against the appropriate prototype screenshots; record remaining differences.

**Current status.** Not started; depends on Plan 16.

**Blocking decisioning.** None known. If a visual mismatch requires changing a model assumption or map imagery source, document the options and expected effect before making that change.

## Completion record

Fill this table as plans finish. Record the deployed version and stable Site URL so the user can review each increment. Link to the change, test output, or reviewed capture when available.

| Plan | Completed on | Site version / URL | Change / evidence | Remaining difference or decision |
| --- | --- | --- | --- | --- |
| 01 | 2026-11-01 | [Version 3](https://nuke-simulator-rebuild.maquaman.chatgpt.site) (private) | `npm run verify`: 3 unit, 5 integration, and 3 browser tests passed; [fixed-tile baseline](site/tests/e2e/map.spec.ts-snapshots/plan-01-map-initial-darwin.png), [authenticated hosted capture](docs/plan-01-hosted-v3.png); source commit `ff356abbecc9979dc1373b78c1552c7cf2d4f785` | Prototype controls and effects are scheduled for later plans. |
| 02 | 2026-11-01 | [Version 5](https://nuke-simulator-rebuild.maquaman.chatgpt.site) (private) | `npm run verify`: 82 unit, 5 integration, and 5 browser tests passed; [fixed-tile panel baseline](site/tests/e2e/device-panel.spec.ts-snapshots/plan-02-device-panel-reference-darwin.png), [hosted panel capture from version 4](docs/plan-02-hosted.png), authenticated version 5 input check; source commit `ec8857f289838ae0cdd66f2bf1267e18bacc2e4b` | Scenario, launch, reset, mode, night, hide, and cloud controls are assigned to later plans. |
| 03 | 2026-11-01; review fixes 2026-11-02 | [Version 7](https://nuke-simulator-rebuild.maquaman.chatgpt.site) (private) | `npm run verify`: 106 unit, 7 integration, and 8 browser tests passed; [Scenario baseline](site/tests/e2e/device-panel.spec.ts-snapshots/plan-03-scenario-panel-darwin.png), [version 6 Hiroshima capture](docs/plan-03-hosted-hiroshima.png), authenticated version 7 interaction check; source commit `7b7fd11b87d3efc7485f8ed671630c2e6b738440` | Missile and launch behavior begin in Plan 04; the remaining controls and effects follow later. |
| 04 | 2026-11-02; review fixes 2026-11-02 | [Version 9](https://nuke-simulator-rebuild.maquaman.chatgpt.site) (private) | Clean-install `npm run verify`: 117 unit, 9 integration, 12 browser tests; [fixed-time missile capture](site/tests/e2e/missile.spec.ts-snapshots/plan-04-missile-3200ms-darwin.png); hosted launch smoke with HTTP 200 and no page errors; GitHub source `fa11464e2e07995c28e2bf8ca55532e2e160e0e7`, Sites source `72cc4fa6cd5921b6b170cd45ada04e1f9e2fb0fb` | The prototype capture hides controls and uses live imagery; Hide/Show arrives in Plan 15. Impact flash and blast arrive in Plan 05. |
| 05 | 2026-11-02; review fixes 2026-11-02 | [Version 11](https://nuke-simulator-rebuild.maquaman.chatgpt.site) (private) | Clean-install `npm run verify`: 124 unit, 13 integration, 16 browser tests; revised [impact](site/tests/e2e/blast.spec.ts-snapshots/plan-05-impact-50ms-darwin.png), [expansion](site/tests/e2e/blast.spec.ts-snapshots/plan-05-expansion-2300ms-darwin.png), [settled](site/tests/e2e/blast.spec.ts-snapshots/plan-05-settled-darwin.png); authenticated hosted HTTP 200, ready map, completed white-hot blast, no page errors; GitHub source `a9d3e1ccd5188bf0c63dbedf62e5aaac6453fb48`, Sites source `f2bdbb295875f7273a91b3a5c05125d2f0eb019a` | Zone divisions/ruler/markers arrive in Plan 06; pitched terrain refinement in Plan 07; 3D fireball in Plan 08; cloud monitor in Plan 09. |
| 06 | 2026-11-02; user-testing fixes 2026-11-02 | [Version 13](https://nuke-simulator-rebuild.maquaman.chatgpt.site) (private) | Clean-install `npm run verify`: 128 unit, 17 integration, 21 browser tests; reviewed [settled measure](site/tests/e2e/blast-inspection.spec.ts-snapshots/plan-06-settled-darwin.png) and [Light tooltip](site/tests/e2e/blast-inspection.spec.ts-snapshots/plan-06-light-tooltip-darwin.png); authenticated hosted HTTP 200, completed strike, four markers, no page errors; GitHub source `8e290f95a9b5d78192b7426e826177d47ecfeca8`, Sites source `eb365f205946b0096c12025c8b0e6aa575eaeac9` | Pitched-ground alignment arrives in Plan 07; 3D fireball in Plan 08; cloud monitor in Plan 09. |
| 07 | 2026-11-03 | [Version 14](https://nuke-simulator-rebuild.maquaman.chatgpt.site) (private) | Clean-install `npm run verify`: 130 unit, 19 integration, 24 browser tests; reviewed [overhead](site/tests/e2e/pitched-blast.spec.ts-snapshots/plan-07-top-down-darwin.png), [pitched settled](site/tests/e2e/pitched-blast.spec.ts-snapshots/plan-07-pitched-darwin.png), and [pitched expansion](site/tests/e2e/pitched-blast.spec.ts-snapshots/plan-07-pitched-expansion-darwin.png); authenticated hosted HTTP 200, 60° pitch, complete strike, four markers, no page errors; GitHub source `5d99380f0ceedf950113fa1df3fcf5d4f5fb5a80`, Sites source `65f494af38a9a5d95776fb5a71aa84a57b9faba1` | The prototype's raised dome and cloud instrument remain assigned to Plans 08 and 09. |
| 08 | — | — | — | — |
| 09 | — | — | — | — |
| 10 | — | — | — | — |
| 11 | — | — | — | — |
| 12 | — | — | — | — |
| 13 | — | — | — | — |
| 14 | — | — | — | — |
| 15 | — | — | — | — |
| 16 | — | — | — | — |
| 17 | — | — | — | — |
