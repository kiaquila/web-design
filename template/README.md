# Web design project harness

This directory is a lightweight reference for a standalone web-design
repository. Copy its contents manually, adapt them in a focused PR, and then
own the copied files locally.

It is intentionally not a starter website: it provides development guardrails
without choosing a framework, visual system, hosting provider, customer facts,
or deployment configuration.

## What it provides

- concise repository and design instructions;
- one least-privilege CI workflow with pinned actions and an OSV scan;
- checks for secrets, personal paths, generated output, unsafe workflow
  triggers, and unpinned actions;
- explicit project check commands without shell parsing;
- configurable raw and gzip payload budgets, including the `alex-neon` limits
  of 48 KiB raw / 20 KiB gzip for JavaScript and 45 KiB gzip for critical
  first-render text;
- regression tests for the harness itself.

It has no release, lock, manifest, synchronization, update-PR, managed-file, or
upstream-verification mechanism.

## Adopt it

1. Copy the contents of this directory into a new repository or a dedicated
   migration branch of an existing repository.
2. Replace `replace-me` in `web-design.config.json` and `.github/CODEOWNERS`.
3. Add the project's real build and test commands to `projectChecks` as command
   arrays. Do not use placeholder commands that always pass.
4. Set `outputDirectory`, list the exact `criticalFiles` fetched before first
   render, and calibrate the budgets from a verified production build. Keep the
   JavaScript and critical-text defaults unless the project documents why it
   needs more.
5. Merge the package scripts into the project's existing `package.json`; do not
   overwrite its toolchain or lockfile.
6. Run `npm run preflight` and record responsive, keyboard, reduced-motion, and
   critical-flow checks in the PR.

Later template improvements are copied selectively through normal reviewable
PRs. Nothing in a project reaches back to `web-design` at runtime or in CI.
