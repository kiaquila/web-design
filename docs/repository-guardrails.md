# Repository guardrails

This repository uses a small, project-shaped subset of the practices in
[`kiaquila/unicorn-hub`](https://github.com/kiaquila/unicorn-hub). It keeps the
parts that protect a multi-project design workspace and intentionally omits the
portable bootstrap system, Spec Kit feature memory, AI-review routing,
multi-agent orchestration, package-manager migration, and generic stack profiles.

## Instruction hierarchy

`AGENTS.md` files are scoped by directory. The root file defines repository-wide
rules; a project's file supplies business, brand, source-of-truth, and validation
context for files below that project. Agents should read both. Project rules may
be stricter but cannot override root safety policy.

This makes a local project file the right place for details such as approved
concept names, factual content sources, design constraints, supported locales,
and project-specific test commands. It should not repeat the entire root file.

## Automated policy

`scripts/check-repository.mjs` validates the complete tracked repository:

- required root and per-project context files;
- lower-case kebab-case project paths listed in `.repo-guard.json`;
- common secret, token, credential, and private-key signatures;
- personal absolute filesystem paths;
- generated output, dependency directories, caches, and local environment files;
- symbolic links;
- explicit least-privilege workflow permissions;
- commit-SHA pinning for external GitHub Actions;
- absence of the high-risk `pull_request_target` trigger.
- consistency of active temporary stages: `design-<slug>` Worker names,
  project-local Wrangler configuration, public preview URLs, and standard deploy
  scripts.

The PR workflow checks out policy code from the default branch and runs that
trusted copy against the proposed PR tree. On the first installation only, when
the default branch has no policy script yet, it uses the PR copy so the guard can
bootstrap. Once merged, a PR cannot weaken the script and benefit from that
weaker version in the same change.

Changes that intentionally relax a trusted requirement therefore use two PRs:
first update the policy while keeping the old requirement satisfied; after that
policy is on `main`, remove the no-longer-required item. This is deliberate
fail-closed behavior.

## Project checks

CI currently validates both Chaijaná deliverables:

- the standalone menu build and tests;
- the website lint, production build, and rendered HTML tests.

When a new project is added, extend Project CI with a focused job for its actual
stack. Do not add placeholder checks that always pass.

Temporary customer stages use the separate contract in
[`stage-hosting.md`](./stage-hosting.md). The `stageProjects` map in
`.repo-guard.json` is an inventory of stages that should currently exist; it is
not a permanent requirement for every project in the repository.

## Supply-chain protection

- GitHub Actions are pinned to full commit SHAs.
- Dependabot watches GitHub Actions and the existing website lockfile weekly,
  with a cooldown before newly published dependency versions are proposed.
  Routine minor and patch version updates are grouped by ecosystem. Major
  TypeScript, ESLint, and `@types/node` updates are intentionally ignored until
  the website toolchain or Node runtime is deliberately migrated.
- OSV Scanner checks the repository on pull requests, pushes to `main`, weekly,
  and on demand.

## GitHub settings after merge

The repository preserves AI co-author attribution across each supported merge
method:

- regular merge commits use the pull request title and body as their commit
  title and message, so a final
  `Co-authored-by: Codex <codex@openai.com>` trailer is retained;
- squash merges use the source commit messages, which retain the required
  `Co-authored-by: OpenAI Codex <codex@openai.com>` commit trailers;
- rebase merges retain the source commits and their trailers directly.

The regular-merge settings are repository metadata rather than versioned files.
Verify them with
`gh api repos/kiaquila/web-design --jq '[.merge_commit_title, .merge_commit_message]'`;
the expected values are `["PR_TITLE","PR_BODY"]`.

After the workflows exist on `main`, protect `main` with:

- pull requests required before merge;
- required checks `repository-guard`, `chaijana-menu`, `chaijana-website`, and
  `osv-scan`;
- stale approvals dismissed after new commits;
- conversation resolution required;
- administrator enforcement enabled;
- force pushes and branch deletion disabled.

For a solo-maintainer repository, zero mandatory human approvals is reasonable
as long as checks and conversation resolution remain required. Increase the
approval count when another maintainer is available.

## Local check

Run before publishing any PR:

```bash
node scripts/check-repository.mjs
node --test tests/repository-guard.test.mjs
```

Then run the affected project's commands from its `AGENTS.md` or `README.md`.
