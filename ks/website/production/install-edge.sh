#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
target="${KS_DESIGN_DEPLOY_TARGET:-cz}"

if [[ ! "$target" =~ ^[a-zA-Z0-9._@-]+$ ]]; then
  echo "Invalid SSH target: $target" >&2
  exit 1
fi

remote_tmp="$(ssh "$target" mktemp -d)"
if [[ "$remote_tmp" != /tmp/tmp.* ]]; then
  echo "Unexpected temporary directory from $target: $remote_tmp" >&2
  exit 1
fi
trap 'ssh "$target" "rm -rf -- \"$remote_tmp\"" >/dev/null 2>&1 || true' EXIT

# The server-created, validated temporary path intentionally expands locally.
# shellcheck disable=SC2029
scp "$script_dir/ks-design.art-http.conf" "$target:$remote_tmp/ks-design.art-http.conf"
# shellcheck disable=SC2029
scp "$script_dir/ks-design.art.conf" "$target:$remote_tmp/ks-design.art.conf"

# The validated server-created temporary path intentionally expands locally.
# shellcheck disable=SC2029
ssh "$target" "bash -s -- '$remote_tmp'" <<'REMOTE'
set -euo pipefail

remote_tmp="$1"
site=/etc/nginx/sites-available/ks-design.art.conf
enabled=/etc/nginx/sites-enabled/ks-design.art.conf
backup="$remote_tmp/ks-design.art.previous.conf"
had_live_tls=false
backup_ready=false
finished=false

if sudo test -f "$site" &&
  sudo grep -q 'listen 443 ssl' "$site" &&
  sudo test -f /etc/letsencrypt/live/ks-design.art/fullchain.pem &&
  sudo test -f /etc/letsencrypt/live/ks-design.art/privkey.pem; then
  had_live_tls=true
  sudo cp -a "$site" "$backup"
  backup_ready=true
fi

restore_live_edge() {
  if [[ "$backup_ready" == true && "$finished" != true ]]; then
    sudo install -m 0644 "$backup" "$site"
    sudo nginx -t
    sudo systemctl reload nginx
  fi
}
trap restore_live_edge EXIT

# A first installation needs a plaintext vhost for the ACME challenge. During
# refreshes the existing TLS vhost stays live; it already exposes the same
# challenge directory, so a Certbot failure cannot take HTTPS offline.
if [[ "$had_live_tls" != true ]]; then
  sudo install -m 0644 "$remote_tmp/ks-design.art-http.conf" "$site"
  sudo ln -sfn "$site" "$enabled"
  sudo nginx -t
  sudo systemctl reload nginx
  sudo cp -a "$site" "$backup"
  backup_ready=true
fi

curl --fail --silent --show-error -H 'Host: ks-design.art' http://127.0.0.1/ >/dev/null
sudo certbot certonly --webroot --webroot-path /var/www/certbot \
  --cert-name ks-design.art --domains ks-design.art,www.ks-design.art \
  --non-interactive --agree-tos --keep-until-expiring

sudo install -m 0644 "$remote_tmp/ks-design.art.conf" "$site"
sudo ln -sfn "$site" "$enabled"
if ! sudo nginx -t || ! sudo systemctl reload nginx; then
  exit 1
fi
curl --fail --silent --show-error \
  --resolve ks-design.art:443:127.0.0.1 https://ks-design.art/ >/dev/null
finished=true
REMOTE

echo "Installed the ks-design.art Nginx edge and TLS certificate on $target."
