# Nuke Simulator Site source

This directory contains the static Site source for the workspace roadmap. The published Site is the user-facing application. Plans 01–03 provide a full-screen satellite map and prototype-style Scenario and Device controls. Plan 04 adds map targeting, a red crosshair, and an incoming missile. Plan 05 adds an impact flash, expanding single blast, and Reset. Plan 06 adds the settled blast ruler, zone outlines, and inspection markers. Users can pan, zoom, choose any of the 47 fixed devices, enter a custom yield, or select one of 20 scenarios to move the map and prepare its device. Each new click replaces the previous strike. Hover or focus a zone marker for its description and modeled span; click to pin its popup and press Escape to clear it. Alternate views arrive in later plans.

## Engineering setup

Requires Node.js 22.13 or newer. In this directory, run `npm ci`, then `npx playwright install chromium` if the test browser is not installed. Run `npm run verify` for type checking, lint, unit and integration tests, a production build, and browser checks. `npm run dev` and `npm run preview` are optional engineering tools; they are not required for using the published Site.

## Source layout

- `src/catalog/`: exact grouped device choices and per-warhead MIRV data.
- `src/domain/`: pure geographic, blast-radius, and annular area calculations in kilometers and square kilometers.
- `src/application/`: pure selection and single-strike timeline.
- `src/rendering/`: MapLibre setup, camera projection, Canvas effects, and geographic inspection overlays.
- `src/ui/`: React mount, map states, and accessible marker popups.
- `tests/`: deterministic unit, integration, and browser checks.

The map uses Esri World Imagery with source attribution visible in the map control. The map service is external; unavailable imagery produces a retry notice. The Site is configured as a static `dist/` build in `.openai/hosting.json`. The prototype folders stay outside this source repository and are read only. See `docs/model.md` for yield units and limits and `docs/visual-reference.md` for staged differences from the prototype.
