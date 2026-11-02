# Nuke Simulator Site source

This directory contains the static Site source for the workspace roadmap. The published Site, rather than a local server, is the user-facing application. Plans 01–02 provide a full-screen satellite map centered on Midtown Manhattan and a prototype-style Device panel. Users can pan, zoom, choose any of the 47 fixed devices, or enter a positive custom yield in megatons. Launch and effect controls arrive in later plans.

## Engineering setup

Requires Node.js 22.13 or newer. In this directory, run `npm ci`, then `npx playwright install chromium` if the test browser is not installed. Run `npm run verify` for type checking, lint, unit and integration tests, a production build, and browser checks. `npm run dev` and `npm run preview` are optional engineering tools; they are not required for using the published Site.

## Source layout

- `src/catalog/`: exact grouped device choices and per-warhead MIRV data.
- `src/domain/`: pure geographic and later physical model calculations.
- `src/application/`: pure device selection and validation; later launch state and timeline.
- `src/rendering/`: MapLibre setup and screen-coordinate boundary.
- `src/ui/`: React mount and user-facing map states.
- `tests/`: deterministic unit, integration, and browser checks.

The map uses Esri World Imagery with source attribution visible in the map control. The map service is external; unavailable imagery produces a retry notice. The Site is configured as a static `dist/` build in `.openai/hosting.json`. The prototype folders stay outside this source repository and are read only. See `docs/model.md` for yield units and limits and `docs/visual-reference.md` for staged differences from the prototype.
