# KS production hosting

Production serves the static build at `https://ks-design.art` from the `cz`
server. Cloudflare Workers remains a disposable stage, not the production
origin.

## Isolation contract

- Compose project: `ks-design-portfolio`
- Container listener: `8080`
- Host binding: `127.0.0.1:3100`
- Host edge: `/etc/nginx/sites-available/ks-design.art.conf`
- Server source directory: `/opt/ks-design-portfolio`
- TLS: Let's Encrypt certificate named `ks-design.art`

The deployment does not use the Capsule Zero Compose file, project, network,
volumes, images, or loopback ports (`3000`, `8080`, `4433`, and `5432`). The
deploy script snapshots the running Capsule Zero container IDs before and after
the portfolio update and fails if they change.

## DNS

Spaceship Advanced DNS carries these records with a 30-minute TTL:

| Host | Type | Value |
| --- | --- | --- |
| `@` | `A` | `178.105.95.17` |
| `@` | `AAAA` | `2a01:4f8:1c18:af10::1` |
| `www` | `CNAME` | `ks-design.art` |

## Deployment

Production deploys automatically after a merged pull request changes `ks/**`
and the resulting push to `main` passes every push check plus the required
checks on the reviewed pull-request head. A direct push, a pull-request event,
or a red/missing check fails closed before production credentials are exposed.

The workflow is [`.github/workflows/ks-production-deploy.yml`](../../../.github/workflows/ks-production-deploy.yml).
It uses the GitHub Environment `production`, whose deployment branch policy
must allow `main` only. Configure these Environment values:

| Kind | Name | Purpose |
| --- | --- | --- |
| Variable | `CLOUDFLARE_ZONE_ID` | Public zone ID for `ks-design.art` |
| Variable | `KS_DESIGN_SSH_HOST` | cz Tailnet IP or MagicDNS name |
| Variable | `KS_DESIGN_SSH_KNOWN_HOSTS` | Pinned cz SSH host key in `known_hosts` format |
| Variable | `TAILSCALE_OAUTH_CLIENT_ID` | Tailnet workload-identity OAuth client ID |
| Variable | `TAILSCALE_AUDIENCE` | Audience configured for the GitHub workload identity |
| Secret | `CLOUDFLARE_API_TOKEN` | Token scoped to Cache Purge for the single zone |
| Secret | `KS_DESIGN_SSH_PRIVATE_KEY` | Deploy-only key for the `ksdeploy` account on cz |

Both jobs run on GitHub-hosted infrastructure. Only the deployment job joins
the private Tailnet through Tailscale workload identity federation, after its
required checks have passed and the `production` Environment has released its
credentials. cz accepts the deploy-only `ksdeploy` SSH key over that Tailnet;
no public SSH exposure or long-lived Tailscale auth key is used. The key can
run only the root-owned `/usr/local/sbin/ks-production-deploy` wrapper. That
wrapper validates its staged input, owns the Docker and `/opt` mutation, and
cannot be used to invoke arbitrary Docker commands.

The deploy job has a `ks-production-deploy` concurrency group, so GitHub keeps
only one active deployment and its newest pending candidate. The server wrapper
also serializes the mutation with `flock` and records the greatest GitHub run
ID it has accepted. If an older gate completes after a newer eligible
deployment, its staged revision is skipped before it can overwrite production.
This protects against GitHub's one-pending-job behavior without treating an
unrelated repository push as a KS deployment.

One-time cz setup installs the reviewed wrapper and creates the restricted
account and staging directory. This is an administrator operation; normal
production recovery uses a GitHub Actions re-run rather than an interactive SSH
session:

```bash
sudo ks/website/production/install-deploy-access.sh 'ssh-ed25519 AAAA… github-production'
```

The first server installation, or an intentional TLS/edge refresh, is:

```bash
ks/website/production/install-edge.sh
```

On a first install, the edge installer loads the HTTP-only ACME virtual host,
obtains the certificate through the server's existing Certbot account, then
installs the TLS virtual host. On refresh it keeps the existing TLS edge live
while Certbot runs and restores the previous configuration if validation,
reload, or the final health check fails. Every Nginx change is checked with
`nginx -t` before reload.

## Verification

Automation verifies that Compose reports the container `healthy`, the image
label `org.opencontainers.image.revision` equals the triggering `github.sha`,
and both `/` and `/en/` return successfully. It then purges the Cloudflare zone
cache and compares the SHA-256 of live `/assets/site.js` with
`ks/website/src/js/site.js` from that exact commit.

```bash
dig +short A ks-design.art
dig +short AAAA ks-design.art
curl -I https://ks-design.art/
curl -I https://ks-design.art/en/
curl -I https://www.ks-design.art/
ssh cz 'sudo docker compose -f /opt/ks-design-portfolio/production/docker-compose.yml ps'
```

Cloudflare preview deployments for pull requests remain unchanged at
`*-ks.ks-design.workers.dev`. The permanent Worker URL
`ks.ks-design.workers.dev` remains disabled and is not a production fallback.
