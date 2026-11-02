---
name: development-loop-skill
description: Implement the next roadmap increment in this repository, publish it, open a GitHub PR, review the change against steering files, and wait for the human's merge or fix decision. Use for the full plan-to-PR review loop, not for an isolated edit or review-only request.
---

# Development loop

Run one roadmap plan through implementation, release, and a reviewable PR. The human decides the disposition of review findings and whether to merge.

## Start the increment

1. Read the repository's `AGENTS.md`, `requirements.md`, `architecture.md`, `roadmap.md`, and the selected plan before changing code. Follow the user's latest direction if it narrows or changes the plan. Treat `prototype-code/` and `prototype-screenshots/` as read-only references.
2. Fetch GitHub changes, inspect the working tree, and start from the next ready plan on a dedicated branch. Honor a branch name supplied by the user. Preserve unrelated local changes and reconcile a moved base before pushing.
3. Identify the plan's requirement IDs, observable experience, prototype references, tests, and any real blocking decision. Record `In progress` in the roadmap. Continue useful work while a decision is pending; stop only when it truly prevents completion.

## Implement and publish

Implement the complete plan behind the boundaries in `architecture.md`. Update source-area and model documentation, requirement-to-test evidence, and meaningful unit, integration, and browser tests. Inspect required visual states against the prototype before accepting a screenshot baseline. Run the repository's full verification gate; report exact results and remaining differences.

The project requires each completed increment on the same Site. Follow `docs/sites-publishing.md`: commit and push the exact application source to the GitHub branch first, use a temporary Sites release checkout outside this repository, preserve the Site project ID and audience, verify the release tree and clean build, deploy, check the hosted path, and record version, URL, and source commits in `roadmap.md`. Do not create a nested Git repository in `site/`. A plan is not `Complete` if its required tests or deployment fail.

## Open the PR and review it

Open a PR from the plan branch to `main` with a concise capability summary, requirement IDs, verification results, visual evidence, and Site version. Then make a distinct reviewer pass over the **final PR diff** and the steering files. Check prototype fidelity, architecture boundaries, state and timing behavior, failure paths, accessibility, test quality, documentation, and release provenance.

Post a GitHub review summary and actionable inline comments for real findings. Each finding should name severity, impact, file/line, and a concrete correction or decision. Do not invent findings to fill a quota, and do not mark the PR approved merely because checks pass. Verify the comments appeared on the PR.

**Stop here for human review.** Report the PR URL, deployed Site version, checks, and findings. Do not merge, dismiss, or resolve findings before the human responds.

## Continue after the human responds

Read the latest PR, branch, and review threads before acting; continue from their current state instead of repeating the plan. Follow the human's choice:

- **Fix findings:** implement the requested changes, update tests and docs, rerun the relevant and full gates, push the branch, and republish if application source changed. Reply to each addressed PR comment with the fix and evidence, then resolve that thread.
- **Accept findings as-is:** record the human's disposition in the relevant PR threads. Leave or resolve threads as the human directs; do not silently call them fixed.
- **Merge:** only when explicitly directed, check the current remote base and PR head, then squash merge using the expected head SHA. Sync local `main` and verify the merged source tree. Delete branches only if requested.
- **Stop or change scope:** honor the direction, report what remains open, and end the loop.

If a requested external mutation is blocked by permissions or an approval check, report the exact blocked action and reason. Keep credentials out of source, command arguments, logs, and PR text.
