# Publishing the GitHub source to Sites

The root GitHub repository is the development source of truth. `site/` is an ordinary directory, not a separate checkout. Sites maintains a service-side source record for its deployment workflow; the temporary checkout below is a release artifact and is not used for development. Preserve the project ID in `site/.openai/hosting.json` and the current audience, checking access before publication.

## Prepare the source

1. Run the project's required checks, commit the application source from the project root, and push that commit to GitHub. Fetch the remote and confirm the commit is present on a remote branch. A later documentation-only commit can record the deployed version.
2. Confirm `git status --porcelain -- site` is empty. Set `github_commit` to the exact pushed commit to release. Do not silently omit uncommitted application changes.
3. Create a new empty temporary directory outside this workspace. Open the existing Site in it using the Sites skill's source helper and a fresh source credential. Retain the complete opening result and use its `checkout_path` as `site_release_dir`. Credentials go through the helper's hidden stdin, never command arguments or files.

## Copy and verify the release tree

The following commands run in Bash or Zsh and replace files only in the temporary checkout created above. Never point `site_release_dir` at the project workspace. They stop on an error or a dirty checkout, and the final tree comparison ensures deletions and additions match the selected GitHub commit exactly.

```sh
set -e -o pipefail
test -z "$(git -C "$site_release_dir" status --porcelain --untracked-files=all)"
git -C "$site_release_dir" rm -r -- .
git archive "${github_commit}:site" | tar -x -C "$site_release_dir"
git -C "$site_release_dir" add -A
test "$(git -C "$site_release_dir" write-tree)" = "$(git rev-parse "${github_commit}:site")"
```

In that temporary checkout, run `npm ci`, install the Playwright Chromium browser if needed, and run `npm run verify`. The build produced in `dist/` is the one to package. Run the Sites source helper's packaging operation from the same checkout, passing the complete opening result and an absolute archive path. Its returned source commit belongs to the Sites service record and must match the archive; do not substitute the GitHub commit for it.

## Deploy and record

Use the existing Site project and its current audience. For an owner-private Site, use the Sites private publication operation; for other audiences, save the version and deploy it using the standard operations. Check the terminal deployment result and exercise the plan's hosted path. Record the Site version, URL, GitHub commit, Sites source commit, test results, and any relevant visual evidence in the roadmap. Commit and push the roadmap update to GitHub. Discard the temporary release checkout after the release is complete.
