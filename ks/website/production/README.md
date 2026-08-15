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
| Secret | `CLOUDFLARE_API_TOKEN` | Token scoped to Cache Purge for the single zone |

The deploy job runs on the repo-scoped `ks-production` runner installed on
`cz`, while the credential-free gate job stays on GitHub-hosted infrastructure.
The production host accepts SSH through Tailscale only, so running locally on
the server avoids opening port 22 and removes the need for an SSH secret
entirely. No Cloudflare account token, global API key, or zone ID is stored as a
secret. The runner service account needs non-interactive permission for the
Docker and `/opt/ks-design-portfolio` operations performed by `deploy.sh`.

The deploy job enters its concurrency group only after its required checks have
passed. It serializes production mutations without interrupting an active
rollout, then confirms that its SHA is still the tip of `main` immediately
before deployment. A stale queued revision exits without changing production.

For an intentional manual recovery, run from a clean local `main` that contains
the intended production commit:

```bash
ks/website/production/deploy.sh
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
