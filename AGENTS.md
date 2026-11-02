# Project instructions

## North star

Reimplement the application described in [requirements.md](requirements.md) so its behavior, animation, and appearance reproduce the read-only prototype as closely as possible. Use the boundaries and technology decisions in [architecture.md](architecture.md). A cleaner implementation is valuable only if it preserves the prototype experience.

## Source of truth

1. Read `requirements.md`, `architecture.md`, and `roadmap.md` before changing application code. Work from the next ready roadmap plan unless the user directs otherwise, and update its status and completion record as work proceeds.
2. `prototype-code/` and `prototype-screenshots/` are read-only reference material. Never edit, format, move, delete, or generate files in either directory. The actual screenshot directory is `prototype-screenshots/`; a `/screenshots` directory does not exist in this repository.
3. Use the prototype screenshots for visual intent and the prototype code for behavior, catalog data, timing, and geometry. If the two disagree, record the discrepancy and favor the visible result for visual behavior. Keep the intended interaction from the code when a still image cannot show it.
4. Do not copy the prototype's large `app/page.tsx` into the new implementation. Rebuild its behavior behind the boundaries in `architecture.md`.
5. Keep a traceable connection between each new feature, a requirement ID, and its tests. Update the steering files when an intentional behavior change is approved.

## Code quality

- Write small, cohesive modules with explicit names, strict TypeScript types, and clear units. Prefer straightforward control flow over clever abstractions.
- Keep the physics model pure and deterministic. It must not import React, MapLibre, Canvas, WebGL, browser globals, or rendering code.
- Keep application state transitions outside React components. Components should render state and dispatch user actions.
- Treat one strike as a data object with geographic location, device profile, timing, and modeled effects. Do not let screen pixels become the source of truth for physical distances.
- Handle invalid custom yields, map loading failures, resize, pan, zoom, pitch, antimeridian crossings, and animation cancellation explicitly.
- Preserve visible map attribution and the prototype's short scientific qualification text for illustrative estimates.
- Format code consistently and keep lint and type checks clean.

## Documentation

- The root README must explain setup, commands, controls, architecture, model assumptions, map imagery/attribution, and how to run tests.
- Each logical package or source area has a short README describing its responsibility, public API, dependencies, and important invariants. At minimum document `domain`, `application`, `rendering`, and `ui`.
- Every exported class, interface, type, and function needs a documentation comment stating purpose, units, inputs, outputs, and relevant assumptions. Document nontrivial private functions and algorithms as well. Avoid comments that merely restate the code.
- Every test suite needs a short purpose statement. Document fixtures, fake time or tile data, and why each numerical tolerance or visual threshold is used. A test name must describe observable behavior.
- Record the source and limits of each physical approximation in a model documentation file. Do not present a screening estimate as a measured forecast.

## Tests are part of implementation

- Write or update tests with each behavior change. No feature is complete while its relevant tests are missing or failing.
- Cover model invariants and representative catalog values with unit tests; cover state transitions with application tests; cover projection/rendering contracts with focused tests; and cover critical user paths and visual states with browser tests.
- Run the checks specified in `architecture.md` before declaring work complete. Report exactly which checks ran and any remaining visual differences.
- Publish each completed roadmap increment to the same Site using the Sites workflow. Preserve its project ID and audience; record the deployed version and URL in `roadmap.md`. Local runs and previews are for engineering checks, not the user-facing deliverable.
- Keep the root GitHub repository up to date after each completed roadmap increment. Commit and push the application source before publishing, checking for and reconciling remote changes first. Use the temporary release checkout described in `docs/sites-publishing.md`; do not create a nested Git repository in `site/`.
- Keep tests independent of live map tiles, current weather, random launch angles, and wall-clock time. Inject or freeze these inputs.
- Do not update visual baselines to make a failing comparison pass without inspecting the difference against `prototype-screenshots/`.

## Definition of done

A feature is complete when its requirement IDs have implementation and documented tests, relevant unit and browser checks pass, the UI has been compared with its prototype reference at the documented viewport, its code follows `architecture.md`, and the update is successfully deployed to the Site. For animation or graphics changes, inspect at least launch, impact, expansion, and settled frames.
