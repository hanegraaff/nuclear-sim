# Nuke Simulator Site source

This directory contains the static Site source for the workspace roadmap. The published Site is the user-facing application. Plans 01–03 provide a full-screen satellite map and prototype-style Scenario and Device controls. Plan 04 adds map targeting, a red crosshair, and an incoming missile. Plan 05 adds an impact flash, expanding single blast, and Reset. Plan 06 adds the settled blast ruler, zone outlines, and inspection markers. Plan 07 grounds the center glow on pitched map views. Plan 08 adds a textured fireball dome that grows from the modeled impact and follows the map camera. Plan 09 adds the separate cloud-profile instrument below the controls. Users can pan, zoom, right-drag upward to pitch, choose any of the 47 fixed devices, enter a custom yield, or select one of 20 scenarios to move the map and prepare its device. Each new click replaces the previous strike. The cloud instrument stays on standby through missile flight, rises with the blast, and shows an illustrative peak height and phase; Reset returns it to standby. Hover or focus a zone marker for its description and modeled span; click to pin its popup and press Escape to clear it. Alternate views arrive in later plans.

## Engineering setup

Requires Node.js 22.13 or newer. In this directory, run `npm ci`, then `npx playwright install chromium` if the test browser is not installed. Run `npm run verify` for type checking, lint, unit and integration tests, a production build, and browser checks. `npm run dev` and `npm run preview` are optional engineering tools; they are not required for using the published Site.

## Source layout

- `src/catalog/`: exact grouped device choices and per-warhead MIRV data.
- `src/domain/`: pure geographic, blast-radius, annular area, and cloud-height calculations in physical units.
- `src/application/`: pure selection and single-strike timeline, including the cloud values derived from launch time.
- `src/rendering/`: MapLibre setup, camera projection, Canvas effects and cloud plot, WebGL fireball, and geographic inspection overlays.
- `src/ui/`: React mount, controls, map states, cloud instrument, and accessible marker popups.
- `tests/`: deterministic unit, integration, and browser checks.

The cloud height comes from a per-impact yield and burst-height profile. This numerical estimate never reads the map camera or Canvas; application state turns blast elapsed time into a normalized rise, and the instrument renderer paints the resulting scale and silhouette. A different visual renderer can use the same modeled values. The map uses Esri World Imagery with source attribution visible in the map control. The map service is external; unavailable imagery produces a retry notice. The Site is configured as a static `dist/` build in `.openai/hosting.json`. The prototype folders stay outside this source repository and are read only. See `docs/model.md` for yield units and limits and `docs/visual-reference.md` for staged differences from the prototype.
