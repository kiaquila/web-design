# Temporary stage hosting

> **Migration moratorium:** Cloudflare build, preview, and stage-registration
> checks are disabled in `web-design`. The settings below are retained only as
> migration evidence. Do not reconnect or run them from this monorepository.
> Re-enable the relevant checks in each standalone project only after its files,
> history, configuration, and deployment target have been verified.

Customer previews use Cloudflare Workers Builds. Each active website gets one
temporary Worker with two deployment modes:

| Event | Command after `npm run build` | Result |
| --- | --- | --- |
| Push or merge to `main` | `npm run stage:deploy` | Updates the stable customer stage |
| Push to any other branch | `npm run stage:preview` | Uploads an isolated version and adds its URL to the pull request |

The repository remains the source of truth for the Worker name and runtime
configuration. Cloudflare owns the Git connection and build credentials, so no
Cloudflare token is stored in GitHub or committed here.

## Current stages

Each project below needs its own Worker and its own one-time connection.

### Alex Neon

| Setting | Value |
| --- | --- |
| Worker name | `alex-neon` |
| Repository | `kiaquila/web-design` |
| Production branch | `main` |
| Root directory | `alex-neon/website` |
| Build command | `npm run build` |
| Production deploy command | `npm run stage:deploy` |
| Non-production deploy command | `npm run stage:preview` |
| Included build watch path | `alex-neon/*` |

The landing is static, so Cloudflare serves it with Workers Static Assets from
`dist/`. `alex-neon/website/worker/index.ts` exists only to attach the security
headers the asset pipeline does not set on its own.

The stable URL is `https://alex-neon.ks-design.workers.dev`. Pull-request
previews use the same versioned URL shape documented for Chaijana below.

### Alpha-Centr

| Setting | Value |
| --- | --- |
| Worker name | `alphacentr` |
| Repository | `kiaquila/web-design` |
| Production branch | `main` |
| Root directory | `alphacentr/site` |
| Build command | `npm run build` |
| Production deploy command | `npm run stage:deploy` |
| Non-production deploy command | `npm run stage:preview` |
| Included build watch path | `alphacentr/*` |

The site is static, so Cloudflare serves it with Workers Static Assets from
`dist/`. `alphacentr/site/worker/index.ts` exists only to attach the security
headers the asset pipeline does not set on its own.

The stable URL is `https://alphacentr.ks-design.workers.dev`. Pull-request
previews use the same versioned URL shape documented for Chaijana below.

### Chaijaná

Chaijaná uses this contract:

| Setting | Value |
| --- | --- |
| Worker name | `chaijana` |
| Repository | `kiaquila/web-design` |
| Production branch | `main` |
| Root directory | `chaijana/website` |
| Build command | `npm run build` |
| Production deploy command | `npm run stage:deploy` |
| Non-production deploy command | `npm run stage:preview` |
| Included build watch path | `chaijana/*` |

The stable URL is `https://chaijana.ks-design.workers.dev`. A pull request gets
a versioned URL shaped like
`https://<version>-chaijana.ks-design.workers.dev`. The version prefix is
assigned by Cloudflare and must not be hard-coded.

### KS

| Setting | Value |
| --- | --- |
| Worker name | `ks` |
| Repository | `kiaquila/web-design` |
| Production branch | `main` |
| Root directory | `ks/website` |
| Build command | `npm run build` |
| Production deploy command | `npm run stage:deploy` |
| Non-production deploy command | `npm run stage:preview` |
| Included build watch path | `ks/*` |

The landing is static, so Cloudflare serves it with Workers Static Assets from
`dist/`. `ks/website/worker/index.ts` exists only to attach the security
headers the asset pipeline does not set on its own.

KS is preview-only on Workers. `workers_dev: false` keeps the permanent
`https://ks.ks-design.workers.dev` service disabled, while the explicit
`preview_urls: true` setting preserves pull-request previews at
`https://<version>-ks.ks-design.workers.dev`. Production is deployed separately
to `https://ks-design.art`; successful KS builds from `main` are therefore not
mirrored as a permanent stage deployment in GitHub.

**The build watch path is not optional.** Left at the default, this Worker
builds on every pull request in the repository, and any branch that does not
carry `ks/` fails its build for the obvious reason — which is what happened to
the branch that fixed the nanoid advisory. Setting the include path to `ks/*`
is what keeps unrelated work from consuming, and failing, this project's build.

### Ember

| Setting | Value |
| --- | --- |
| Worker name | `ember` |
| Repository | `kiaquila/web-design` |
| Production branch | `main` |
| Root directory | `ember/website` |
| Build command | `npm run build` |
| Production deploy command | `npm run stage:deploy` |
| Non-production deploy command | `npm run stage:preview` |
| Included build watch path | `ember/*` |

The study is one self-contained HTML file, so its build copies rather than
compiles: `scripts/build.mjs` assembles `dist/` from `src/` and fails if the
page ever gains an off-origin reference or loses a favicon.
`ember/website/worker/index.ts` attaches the security headers, and its policy
is the one exception in this repository that allows inline sources — the
page's stylesheet and its canvas program are inline by design. Everything else
stays shut, including `connect-src 'none'`, which the build check is what
makes safe.

The stable URL is `https://ember.ks-design.workers.dev`, and the portfolio
links the study at its custom domain `https://ember.ks-design.art`. Pull-request
previews use the same versioned URL shape documented for Chaijana above.

**This Worker existed before its settings did.** It was created in the
dashboard ahead of the rollout, and until the table above is entered it builds
on every pull request in the repository — with no root directory it has
nothing to build, so it fails on branches that never touch `ember/`. Entering
the root, the build and deploy commands and the `ember/*` watch path is what
turns that red check green.

### Misha

| Setting | Value |
| --- | --- |
| Worker name | `misha` |
| Repository | `kiaquila/web-design` |
| Production branch | `main` |
| Root directory | `misha/website` |
| Build command | `npm run build` |
| Production deploy command | `npm run stage:deploy` |
| Non-production deploy command | `npm run stage:preview` |
| Included build watch path | `misha/*` |

The CV page is static, so Cloudflare serves it with Workers Static Assets from
`dist/`. `misha/website/worker/index.ts` exists only to attach the security
headers the asset pipeline does not set on its own; unlike the other projects
it sends `style-src 'self'` without `'unsafe-inline'`, because that page sets
no inline styles at all.

The stable URL is `https://misha.ks-design.workers.dev`. Pull-request previews
use the same versioned URL shape documented for Chaijana above.

The page carries a real person's name and career history, and its contact
address is deliberately the placeholder `example@e-mail.com` until the owner
decides what to publish. Keep it that way for as long as this stage is
reachable.

## One-time Cloudflare connection

Repeat these steps once per project, using that project's row from the tables
above. Only the account owner can do this: the build credentials and the Git
connection live in Cloudflare, and no token is stored in this repository or in
GitHub Actions.

1. In **Workers & Pages**, choose **Create application**, then **Import a
   repository**, and connect `kiaquila/web-design`.
2. Name the Worker exactly as the project slug (`alex-neon`, `alphacentr`,
   `chaijana`, `ember`, `ks` or `misha`).
   Cloudflare requires the dashboard name to match `name` in that project's
   `wrangler.json`.
3. Enter the root, build, production deploy, and non-production deploy values
   from the table above.
4. Under **Settings → Build → Branch control**, keep `main` as production and
   enable builds for non-production branches.
5. Under **Settings → Build → Build watch paths**, replace the default include
   path with the project's watch path and leave excludes empty.
6. Save and deploy. If the connection is added after a pull request was opened,
   push a new commit or retry its build to produce the first preview comment.

After this one-time connection, normal work needs no deployment command:

- push a PR branch to refresh its public preview;
- merge the PR to refresh the stable stage when `workers_dev` is enabled;
- changes outside a project's watch path do not consume that project's build.

## Retired GitHub deployment bridge

The former GitHub workflow mirrored successful Cloudflare stage builds into
GitHub Deployments and discovered projects through `stageProjects` and
`previewProjects` in `.repo-guard.json`. That workflow, its registration script,
its tests, and those configuration lists have been removed for the migration
moratorium. Nothing in this repository now waits for or records Cloudflare
build checks.

This description is retained only so a destination repository can decide
whether deployment history is useful there. If it is, implement and review it
inside that repository after migration; do not restore a central bridge here.

## Historical project-stage checklist

Do not use this checklist to add a stage to `web-design`. It records the pieces
that a standalone destination repository may choose to adopt after migration:

1. Keep the site in `<slug>/website` and give it its own lockfile and build.
2. Add `<slug>/website/wrangler.json` with `name: <slug>`, its Worker
   entry point, a pinned compatibility date, `workers_dev: true`, and
   `preview_urls: true`.
3. Add `stage:deploy` and `stage:preview` scripts matching the Chaijaná package.
4. Create and connect a same-named Worker using the one-time procedure above.
   Its stable stage URL will be `https://<slug>.ks-design.workers.dev`.
5. Enable only the Cloudflare checks and deployment history that the standalone
   repository actually needs, then run its own repository and project checks.

Each site stays independent. There is no central path router and no coupling
between customer projects. The initial `workers.dev` host is free of domain
configuration; later, attach one custom subdomain per Worker, for example
`chaijana.stage.<domain>` and `<slug>.stage.<domain>`. Cloudflare then routes the
subdomains directly, so the repository architecture does not change.

## Retire a stage after handoff

1. Confirm the customer deployment is working on the customer's resources.
2. Disconnect Builds and delete the temporary Worker in Cloudflare.
3. Keep the project source and history unless a separate retention decision says
   otherwise.

This offboarding frees the temporary public stage without deleting the delivered
work from the repository.

## References

- [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Build branches and pull request previews](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [GitHub integration and preview comments](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)
- [Monorepo root directories](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/)
- [Build watch paths](https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/)
