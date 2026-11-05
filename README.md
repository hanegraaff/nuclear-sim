# Nuke Simulator

Nuke Simulator is a full-screen satellite-map effects visualizer based on the read-only application in `prototype-code/` and the images in `prototype-screenshots/`. The goal is to preserve its interaction, motion, and appearance while keeping the model, application state, and drawing code separate. Its effects are illustrative screening estimates, not forecasts or emergency guidance.

**Open the private Site:** [Nuke Simulator](https://nuke-simulator-rebuild.maquaman.chatgpt.site). Access is limited to the Site owner; visitors do not need to install or run this repository.

## Use the simulator

Choose one of the prototype's 47 fixed devices, enter a custom yield, or select one of 20 scenarios. A scenario prepares the device and moves the camera; click the map to launch. The default device is Fat Man at 21 kt. Pan and zoom normally, and right-drag upward to pitch the map. The imagery keeps its Esri attribution visible.

A click places a red target and sends an amber-white missile along a curved, smoky path for about 6.5 seconds. Impact produces a flash, expanding color field, and textured ground-anchored fireball. The separate cloud instrument rises with the blast and shows a modeled peak height. The default single-launch mode replaces the previous click. When the blast settles, a dashed ruler, four zone outlines, and keyboard-accessible markers explain the modeled spans; hover or focus a marker, click to pin its popup, and press Escape to clear it.

Multi-Launch Mode keeps every click and permits a new inbound missile while earlier effects expand. Missiles enter from one general direction. Overlapping fields brighten and advance toward warmer colors on the four-band legend without changing any device's yield or geographic radii. Its lower-left map scale and legend replace the single-strike ruler. Turning multi mode off keeps the latest whole click group. A MIRV choice launches one carrier that separates into three or ten reentry vehicles, each with its own target, per-warhead effect size, and impact; the group stays intact when modes change. Reset clears all effects and returns the cloud instrument to standby while preserving the selected device, launch mode, and camera.

The Blast view is available now. Fallout, Audible, Visible, Night, Hide/Show, and complete narrow-screen behavior remain on the [roadmap](roadmap.md). A narrow MIRV launch is reframed when its spread would otherwise leave almost every impact behind the controls or offscreen.

## How it is built

The static Site uses React, TypeScript, Vite, MapLibre GL JS, Canvas 2D, and a MapLibre-aligned WebGL fireball layer. The typed catalog holds device and scenario data. Pure domain functions calculate geodesic targets, per-impact blast radii, cloud height, and bounded overlap intensity in kilometers and megatons. The application store treats each map click as a launch group, advances it with an injected clock, and exposes immutable frames. Rendering projects those frames through the current map camera; React displays state and dispatches user actions. See [architecture](architecture.md), the [Site source guide](site/README.md), and [model assumptions](site/docs/model.md).

The map uses Esri World Imagery with visible provider attribution. Live tiles can change or fail; browser tests use a fixed local tile so they do not depend on the map service. [Visual reference notes](site/docs/visual-reference.md) explain the reviewed comparison states and remaining differences.

## Development and review

Node.js 22.13 or newer is required. From the repository root, run `npm ci --prefix site`, `npx --prefix site playwright install chromium`, then `npm run verify`. This checks types, lint, unit and integration tests, the production build, and browser paths. Local preview is for engineering; the published Site is the user-facing application.

[GitHub](https://github.com/hanegraaff/nuclear-sim) is the source of truth. The `site/` directory belongs to this repository. [Sites publishing](docs/sites-publishing.md) describes the exact-source temporary checkout, clean verification, and private deployment. The [roadmap](roadmap.md) records each increment, status, and Site version. [Requirements](requirements.md) and [project instructions](AGENTS.md) define behavior, tests, and read-only prototype handling.

To run the full next-plan workflow, invoke [`$implement-next-plan`](.agents/skills/implement-next-plan/SKILL.md). Its developer, browser tester, and technical writer prepare the PR for your review; an independent code reviewer is used for higher-risk changes.
