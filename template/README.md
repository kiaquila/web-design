# Web design project harness

This directory is a lightweight reference for a standalone web-design
repository. Copy its contents manually, adapt them in a focused PR, and then
own the copied files locally.

It is intentionally not a starter website: it provides development guardrails
without choosing a framework, visual system, hosting provider, customer facts,
or deployment configuration.

## What it provides

- concise repository and design instructions;
- one least-privilege CI workflow with pinned actions and an OSV scan that
  annotates the pull request and fails on vulnerabilities;
- weekly Dependabot updates that group minor and patch releases, keep majors
  separate, and hold freshly published versions back for a cooldown period;
- a `.gitattributes` that keeps the harness out of the repository's GitHub
  language statistics;
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
6. Point the `npm` entry in `.github/dependabot.yml` at the directory that holds
   the project's `package.json` and lockfile, and remove the entry when the
   project has no npm dependencies. Enable Dependabot alerts and security
   updates in the repository settings as well; the configuration file only
   schedules version updates.
7. Drop any `.gitattributes` line for a file the project owns as product code.
8. Run `npm run preflight` and record responsive, keyboard, reduced-motion, and
   critical-flow checks in the PR.

Later template improvements are copied selectively through normal reviewable
PRs. Nothing in a project reaches back to `web-design` at runtime or in CI.
