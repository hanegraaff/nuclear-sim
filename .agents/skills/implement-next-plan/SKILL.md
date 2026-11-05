---
name: implement-next-plan
description: Implement the next ready roadmap plan, test the website, update documentation, publish the Site, and take a GitHub PR through the human's fix-or-merge decision. Use for the full plan-to-PR workflow, not an isolated edit or review.
---

# Implement next plan

The primary agent coordinates one roadmap increment and owns branch integration, release verification, Sites publication, the PR, and squash merge. Delegate implementation, browser testing, and documentation to the predefined agents. If named custom-agent selection is unavailable, give each delegated agent its corresponding `.codex/agents/*.toml` instructions. If delegation is unavailable, report the blocker.

## Start or resume

Read `AGENTS.md`, `requirements.md`, `architecture.md`, `roadmap.md`, and the selected plan. Reconcile `main` with its remote before creating a plan branch; honor a branch name supplied by the human. Mark the next `Ready` plan `In progress`. On resume, inspect the existing branch, PR, reviews, and comments and continue from completed work. Preserve unrelated changes, the existing Site identity and audience, and the read-only prototype directories.

## Build a release candidate

1. Delegate the plan, requirement IDs, prototype references, architecture boundaries, and application/test ownership to **`plan_developer`**. It returns working code, documented tests, and requirement-to-test evidence. The developer runs focused checks while building.
2. Give the testable site to **`experience_tester`** for one browser pass across the plan's user paths and relevant prototype frames. Ask for one prioritized report with reproduction steps and visual evidence. The tester operates the website; automated tests or source inspection alone do not satisfy this pass.
3. Give the consolidated defects to the developer for a batch correction. The tester rechecks affected paths only. Repeat a broad pass only if a substantial regression or new blocking defect makes the candidate untrustworthy. Do not refresh visual baselines without inspecting differences against `prototype-screenshots/`.
4. Once behavior is stable, delegate prose documentation to **`technical_writer`**. The writer revises the current capability narrative as a coherent whole, removes stale or duplicate plan-by-plan prose, and checks the implementation and tests. If the writer finds a material contradiction, have the developer correct it and recheck the affected behavior. The primary agent owns roadmap status and release provenance.

Run the required full `npm run verify` gate **once in the clean temporary release checkout** described in `docs/sites-publishing.md`; do not duplicate it in the working checkout without a concrete reason. Confirm that checkout matches the exact pushed GitHub `site/` tree, then package and deploy to the existing Site. The primary agent checks the hosted plan path in a browser and records the Site version, URL, GitHub commit, and Sites source commit in `roadmap.md`. If a gate, deployment, or hosted path fails, fix the cause and repeat the affected checks. Mark the plan `Complete` only when `AGENTS.md` and `architecture.md`'s definition of done is met.

## PR and human decision

Open a PR to `main` with the capability, requirement IDs, checks, visual evidence, and deployed Site version. Use **`plan_reviewer`** only when the change materially affects physics, architecture boundaries, map projection, rendering contracts, or another high-risk area. Have it review the final diff once; the primary agent posts any actionable findings in the PR and verifies that they appear. Do not require a separate review cycle for routine changes.

**Pause once for the human** with the PR, Site, checks, and any findings. On the human's response, inspect all new review bodies, inline threads, and general comments:

- **Approve or proceed:** squash merge, recording any accepted findings as accepted rather than fixed.
- **Request fixes:** batch the selected findings and human comments for the developer. Run focused tests and recheck affected browser paths; rerun the full release gate and republish only if the Site source changed. Refresh affected documentation, respond to addressed comments with evidence, and resolve fixed threads. Squash merge without another routine pause. Stop for a genuinely new blocking decision.
- **Stop or change scope:** follow the human's direction and leave the PR state explicit.

Before merging, fetch the remote, check the PR head and base, merge using the expected head SHA, and sync local `main`. Delete branches only when requested. Keep credentials out of source, command arguments, logs, and PR text.
