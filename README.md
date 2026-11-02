# Nuke Simulator

This repository contains a production-quality reimplementation of the nuclear effects map in `prototype-code/`. The aim is to reproduce the prototype's appearance and motion while keeping the physical model, application state, and rendering independent and testable. The prototype code and images are read-only references.

## Project status

[Plans 01–03 of the roadmap](roadmap.md) are complete. The published Site has a full-screen satellite map and prototype-style Scenario and Device controls. Choose from 47 devices or enter a custom yield; selecting one of 20 historical and hypothetical scenarios moves the map and prepares its device. Launches arrive in the next plan.

**Open the private Site:** [Nuke Simulator](https://nuke-simulator-rebuild.maquaman.chatgpt.site). Access is limited to the Site owner. Users do not need to run the application locally.

## Start here

1. [Roadmap](roadmap.md) — the living sequence of small, visible implementation plans, their status, and decisions.
2. [Requirements](requirements.md) — user behavior, visual references, catalogs, model needs, and acceptance criteria.
3. [Architecture](architecture.md) — chosen stack, package boundaries, model approach, and test strategy.
4. [Agent instructions](AGENTS.md) — coding, documentation, testing, and prototype-read-only rules.

## Reference material

- `prototype-code/` contains the current reference application and its tests.
- `prototype-screenshots/` contains nine visual references. The actual directory name is `prototype-screenshots/`.

The implementation uses React, TypeScript, Vite, and MapLibre GL JS. Later plans add Canvas 2D and a MapLibre-aligned WebGL fireball layer. Its static build is published through Sites with a private audience. The map uses satellite imagery with visible provider attribution. Effect estimates will be illustrative; model assumptions and limits are documented in [the model notes](site/docs/model.md) as the model grows.

## Development and review

Implement one roadmap plan at a time. Each plan must publish an observable visual change to the same Site after its code, documentation, and relevant tests pass. From the repository root, install dependencies with `npm ci --prefix site`, install the test browser with `npx --prefix site playwright install chromium`, and run `npm run verify`. Local execution is used for development and automated tests only. See the [Site source README](site/README.md) for its layout and [visual reference notes](site/docs/visual-reference.md) for reviewed differences. Use the roadmap's completion record to track Site versions and URLs.

## GitHub and Site source

[GitHub](https://github.com/hanegraaff/nuclear-sim) tracks the whole project, including the steering files, implementation, and read-only prototype references. Run Git commands from the project root to commit and push changes to its `main` branch. The `site/` directory also has a separate local Git checkout used by the Sites publishing workflow; its Git metadata is not part of the GitHub repository. Keep both source histories in sync when completing a plan.

In a fresh GitHub clone, open the existing Site source with the Sites workflow in an empty directory, then reconcile that checkout with `site/` before publishing. Preserve the project ID in `site/.openai/hosting.json` and the existing Site audience.
