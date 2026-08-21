# Web Design Project Template

`web-design` is the shared source of truth for standalone web projects: design
and content integrity, repository safety, testing, reviews, deployment
discipline, and controlled updates. It intentionally contains no customer
project or production credential.

The repository is designed to be marked as a GitHub Template. A repository
created from it contains guardrail workflows and a safe `no-deploy` profile;
the project owner then records the real project shape in
`.web-design/project.json` and applies the owner-only GitHub settings.

## Start a new project

1. Choose **Use this template** on GitHub and create a private repository.
2. Clone it and run:

   ```bash
   npm ci --ignore-scripts --prefix .web-design/policy
   npm run setup -- --slug my-project --profile static-cloudflare \
     --source-commit <40-character-web-design-release-sha> \
     --root-directory website \
     --check "npm --prefix website run check"
   ```

3. Replace the clearly marked project placeholders in `README.md` and
   `AGENTS.md`; keep business facts and approvals traceable.
4. Run `npm run preflight` and open the first pull request.
5. Configure deployment credentials only in the destination platform's secret
   store. Creating a repository from this template never deploys by itself.
6. Apply the owner-only GitHub settings in
   [`docs/operations/github-setup.md`](./docs/operations/github-setup.md).

Available profiles are `no-deploy`, `static-cloudflare`, `next-cloudflare`,
`static-vercel`, and `custom-production`. Profiles describe policy and expected
deployment shape; names, domains, account identifiers, and secrets remain
project-owned.

## Adopt the baseline in an existing project

Copy the baseline into a migration branch, preserve the project's own README,
instructions, deployment files, and application code, then configure
`.web-design/project.json`. The migration must pass the project's existing tests
and this repository's policy tests before it is merged.

The canonical standards are under [`docs/standards/`](./docs/standards/). The
bootstrap and update runbooks are under
[`docs/operations/`](./docs/operations/).

## Receive future updates

Managed files are enumerated in `.web-design/managed-files.json`; the installed
hashes and exact upstream commit are recorded in `.web-design/lock.json`.
Updates are deliberately pull-request based:

```bash
npm run sync:web-design -- plan \
  --source-ref <40-character-release-commit> \
  --version <release-version>

npm run sync:web-design -- apply \
  --source-ref <40-character-release-commit> \
  --version <release-version>

npm ci --ignore-scripts --prefix .web-design/policy
npm run preflight
```

The updater replaces only allowlisted managed files. If a managed file was
locally changed since the previous update, it fails without writing anything.
Project code, assets, facts, local instructions, deployment configuration, and
secrets are never managed by the updater. See
[`docs/operations/updates.md`](./docs/operations/updates.md).

## Repository commands

```bash
npm run check       # repository policy + managed-file drift
npm test            # baseline regression tests
npm run preflight   # both of the above
```

Releases are immutable SemVer tags. Consumer repositories pin the full commit
SHA even when a release version is shown to humans.
