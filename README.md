# Nuke Simulator

This repository contains a production-quality reimplementation of the nuclear effects map in `prototype-code/`. The aim is to reproduce the prototype's appearance and motion while keeping the physical model, application state, and rendering independent and testable. The prototype code and images are read-only references.

## Project status

[Plans 01–08 of the roadmap](roadmap.md) are published. Clicking the map sends a 6.5-second missile toward a geographic target, then produces a flash and expanding single blast with a textured 3D fireball. The settled effect has four zone boundaries, a dashed distance ruler, and markers with hover, focus, and pinned inspection popups. Pan and zoom normally; right-drag upward to pitch the map and see the field and fireball attached to ground zero. A second click replaces the strike, and Reset clears it while retaining the map camera and device. Alternate views follow in later plans.

**Open the private Site:** [Nuke Simulator](https://nuke-simulator-rebuild.maquaman.chatgpt.site). Access is limited to the Site owner. Users do not need to run the application locally.

## Start here

1. [Roadmap](roadmap.md) — the living sequence of small, visible implementation plans, their status, and decisions.
2. [Requirements](requirements.md) — user behavior, visual references, catalogs, model needs, and acceptance criteria.
3. [Architecture](architecture.md) — chosen stack, package boundaries, model approach, and test strategy.
4. [Agent instructions](AGENTS.md) — coding, documentation, testing, and prototype-read-only rules.

To run a plan through implementation, browser testing, documentation, Sites publication, and a reviewed GitHub PR, invoke [`$implement-next-plan`](.agents/skills/implement-next-plan/SKILL.md). Its [four project agents](.codex/agents/) work under one coordinated flow; your proceed-or-fix decision leads to a squash merge after the required checks pass.

## Reference material

- `prototype-code/` contains the current reference application and its tests.
- `prototype-screenshots/` contains nine visual references. The actual directory name is `prototype-screenshots/`.

The implementation uses React, TypeScript, Vite, MapLibre GL JS, Canvas 2D for the missile and blast field, and a MapLibre-aligned WebGL dome for the fireball. Its static build is published through Sites with a private audience. The map uses Esri satellite imagery with visible provider attribution. Blast radii are illustrative estimates, not measured forecasts; assumptions and limits are documented in [the model notes](site/docs/model.md).

## Development and review

Implement one roadmap plan at a time. Each plan must publish an observable visual change to the same Site after its code, documentation, and relevant tests pass. From the repository root, install dependencies with `npm ci --prefix site`, install the test browser with `npx --prefix site playwright install chromium`, and run `npm run verify`. Local execution is used for development and automated tests only. See the [Site source README](site/README.md) for its layout and [visual reference notes](site/docs/visual-reference.md) for reviewed differences. Use the roadmap's completion record to track Site versions and URLs.

## GitHub and Sites publishing

[GitHub](https://github.com/hanegraaff/nuclear-sim) is the project's source of truth. Run Git commands from the project root; `site/` is a normal directory in that repository. To publish, the Sites workflow copies a committed, pushed `site/` tree into a temporary release checkout, verifies and packages it, and deploys to the existing private Site. The temporary checkout is not part of the workspace. See [Sites publishing](docs/sites-publishing.md) for the exact steps.
