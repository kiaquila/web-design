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

Both jobs run on GitHub-hosted infrastructure. Only the registration and
deployment jobs join the private Tailnet through Tailscale workload identity
federation, after their required checks have passed and the `production`
Environment has released the deploy key. cz accepts the deploy-only `ksdeploy`
SSH key over that Tailnet; no public SSH exposure or long-lived Tailscale auth
key is used. The key can run only the root-owned
`/usr/local/sbin/ks-production-deploy` wrapper. The registration job receives
no Cloudflare token.

After checks pass, every candidate first registers its GitHub run ID with cz.
Only a candidate still recorded as newest can enter the
`ks-production-deploy` concurrency group. The root-owned wrapper serializes
registration and mutation with `flock`, so a late stale gate cannot evict the
newest pending job through GitHub's one-pending-job behavior. An unrelated
repository push does not register a KS candidate.

The wrapper treats the staged directory as untrusted. It independently fetches
`main` with a root-owned, read-only GitHub deploy key, requires that trusted
tip and `ks` tree to equal the candidate, archives `ks/website` from that
trusted object, and byte-compares it with the staged payload before Docker can
read it. The root source mirror is `/var/lib/ks-production/source.git`; its
key is `/root/.ssh/ks-production-source` and is separate from the GitHub
Actions SSH key.

One-time cz setup first creates an Ed25519 key at
`/root/.ssh/ks-production-source`, adds its public half to this private
repository as a **read-only GitHub deploy key**, and pins GitHub's SSH host key
in `/root/.ssh/known_hosts`. The private key must remain root-readable only;
it is never a GitHub Environment secret. Then install the reviewed wrapper and
create the restricted account and staging directory. This is an administrator
operation; normal production recovery uses a GitHub Actions re-run rather than
an interactive SSH session:

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
and both `/` and `/en/` return successfully after the Cloudflare cache purge.
It then compares the SHA-256 of live `/assets/site.js` with
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
