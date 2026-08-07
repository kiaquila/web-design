# Temporary stage hosting

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

## One-time Cloudflare connection

Repeat these steps once per project, using that project's row from the tables
above. Only the account owner can do this: the build credentials and the Git
connection live in Cloudflare, and no token is stored in this repository or in
GitHub Actions.

1. In **Workers & Pages**, choose **Create application**, then **Import a
   repository**, and connect `kiaquila/web-design`.
2. Name the Worker exactly as the project slug (`alphacentr` or `chaijana`).
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
- merge the PR to refresh the stable stage;
- changes outside a project's watch path do not consume that project's build.

## Add another project

1. Keep the site in `<slug>/website` and give it its own lockfile and build.
2. Add `<slug>/website/wrangler.json` with `name: <slug>`, its Worker
   entry point, a pinned compatibility date, `workers_dev: true`, and
   `preview_urls: true`.
3. Add `stage:deploy` and `stage:preview` scripts matching the Chaijaná package.
4. Add the project to `stageProjects` in `.repo-guard.json` with root
   `<slug>/website` and watch path `<slug>/*`.
5. Create and connect a same-named Worker using the one-time procedure above.
   Its stable stage URL will be `https://<slug>.ks-design.workers.dev`.
6. Run `node scripts/check-repository.mjs` plus that project's own checks.

Each site stays independent. There is no central path router and no coupling
between customer projects. The initial `workers.dev` host is free of domain
configuration; later, attach one custom subdomain per Worker, for example
`chaijana.stage.<domain>` and `<slug>.stage.<domain>`. Cloudflare then routes the
subdomains directly, so the repository architecture does not change.

## Retire a stage after handoff

1. Confirm the customer deployment is working on the customer's resources.
2. Disconnect Builds and delete the temporary Worker in Cloudflare.
3. Remove the project from `stageProjects` in `.repo-guard.json` in a normal PR.
4. Keep the project source and history unless a separate retention decision says
   otherwise.

This offboarding frees the temporary public stage without deleting the delivered
work from the repository.

## References

- [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Build branches and pull request previews](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [GitHub integration and preview comments](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)
- [Monorepo root directories](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/)
- [Build watch paths](https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/)
