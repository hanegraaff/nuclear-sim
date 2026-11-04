---
name: implement-next-plan
description: Implement the next ready roadmap plan with project developer, website tester, technical writer, and reviewer agents; publish the Site, review a GitHub PR, then follow the human's fix-or-merge decision. Use for the full plan-to-PR loop, not an isolated edit or review.
---

# Implement next plan

The primary agent coordinates one roadmap increment. It owns branch integration, verification, Sites publication, the PR, review comments, and the final squash merge. Delegate the work below to the four predefined project agents; do not substitute a single-agent implementation or claim an agent's checks ran when they did not. If named custom-agent selection is unavailable, spawn delegated agents and instruct each to read its corresponding `.codex/agents/*.toml` role file before acting. If delegation itself is unavailable, report the blocker.

## Start or resume

Read `AGENTS.md`, `requirements.md`, `architecture.md`, `roadmap.md`, and the selected plan. Read the current branch and remote state. On a new run, select the next `Ready` plan, create a dedicated branch from the reconciled `main` using any branch name supplied by the human, and mark the plan `In progress`. On a resumed run, inspect the existing PR, branch, review threads, submitted reviews, and general PR comments before acting; retain completed work and the existing Site project ID. Preserve unrelated changes and never edit `prototype-code/` or `prototype-screenshots/`.

## Build and test loop

1. Delegate implementation to **`plan_developer`** (`.codex/agents/plan-developer.toml`). Give it the plan, requirement IDs, prototype references, architecture boundaries, and file ownership. It returns working code, relevant documented tests, and a concise requirement-to-test account. The primary agent checks its result before the next stage.
2. Once there is a testable candidate, delegate **`experience_tester`** (`.codex/agents/experience-tester.toml`) and **`technical_writer`** (`.codex/agents/technical-writer.toml`) concurrently. The tester must operate the actual website in a browser, not merely run automated tests or inspect code. It exercises the plan's controls and animation, including launch, impact, expansion, settlement, map gestures, markers, and Reset where applicable. It reports reproducible defects and visual differences with evidence. The writer updates the root and source-area documentation, model/visual notes, and an outsider-readable account of how the increment is built. Keep their file ownership separate.
3. Send tester defects and documentation contradictions to the developer. Repeat the developer → tester/writer handoff until the plan's behavior and documentation are ready. Recheck every affected browser path after a fix. Do not refresh a visual baseline without inspecting the difference against the read-only prototype.

The primary agent runs the full `npm run verify` gate. For each completed increment, follow `docs/sites-publishing.md`: commit and push the exact application source to GitHub, verify it in a clean temporary Sites checkout, deploy to the existing Site without changing its audience, and record the version, URL, and GitHub/Sites source commits in `roadmap.md`. Have the tester operate the **published Site** in a browser for the plan's visible path before opening the PR. A failed gate, Site deployment, or hosted path returns to the build loop; do not mark the plan `Complete` until all required evidence exists.

## PR and human decision

Open a PR to `main` with capability, requirement IDs, checks, visual evidence, and deployed Site version. Delegate an independent review of the **final PR diff** to **`plan_reviewer`** (`.codex/agents/plan-reviewer.toml`). The reviewer reads the steering files and prototype references, reports only concrete findings with severity, impact, file/line, and a correction. The primary agent posts the review summary and actionable inline comments to GitHub, then verifies they appeared. Do not invent findings or approve the PR merely because checks pass.

**Pause once for the human.** Report the PR, Site, checks, and findings. Discover the human's later response and any new review bodies, inline comments, or general PR comments before continuing:

- **Proceed:** record any accepted findings as accepted, without calling them fixed; squash merge the PR.
- **Fix named findings or human comments:** delegate the selected corrections to the developer. The tester rechecks affected website interactions, the writer refreshes affected documentation, and the reviewer checks the corrections. Rerun relevant and full gates. If any `site/` content changed, commit and push it, then repeat the exact-source release and hosted check. Update the roadmap and PR, reply to each addressed comment with evidence, and resolve fixed threads. Then squash merge without another routine human pause. Pause only if a new blocking issue or decision arises.
- **Stop or change scope:** follow the human's direction and leave the PR state explicit.

Before merging, fetch remote changes, check the PR head and base, and use the expected head SHA for the squash merge. Sync local `main` and verify its tree matches the merged branch. Delete branches only when requested. Keep credentials out of source, command arguments, logs, and PR text. If an external action is blocked by permissions or approval review, report the exact action and reason.
