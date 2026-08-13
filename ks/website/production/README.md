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

Run only from a clean `main` that contains the intended production commit:

```bash
ks/website/production/deploy.sh
```

The first server installation, or an intentional TLS/edge refresh, is:

```bash
ks/website/production/install-edge.sh
```

The edge installer first loads the HTTP-only ACME virtual host, obtains or
renews the certificate through the server's existing Certbot account, then
atomically installs the TLS virtual host. Every Nginx change is checked with
`nginx -t` before reload.

## Verification

```bash
dig +short A ks-design.art
dig +short AAAA ks-design.art
curl -I https://ks-design.art/
curl -I https://ks-design.art/en/
curl -I https://www.ks-design.art/
ssh cz 'sudo docker compose -f /opt/ks-design-portfolio/production/docker-compose.yml ps'
```
