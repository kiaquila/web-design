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
scp "$script_dir/ks-design.art-http.conf" "$target:$remote_tmp/ks-design.art.conf"
# shellcheck disable=SC2029
ssh "$target" "
  set -euo pipefail
  sudo install -m 0644 '$remote_tmp/ks-design.art.conf' /etc/nginx/sites-available/ks-design.art.conf
  sudo ln -sfn /etc/nginx/sites-available/ks-design.art.conf /etc/nginx/sites-enabled/ks-design.art.conf
  sudo nginx -t
  sudo systemctl reload nginx
  curl --fail --silent --show-error -H 'Host: ks-design.art' http://127.0.0.1/ >/dev/null
  sudo certbot certonly --webroot --webroot-path /var/www/certbot \
    --cert-name ks-design.art --domains ks-design.art,www.ks-design.art \
    --non-interactive --agree-tos --keep-until-expiring
"

# shellcheck disable=SC2029
scp "$script_dir/ks-design.art.conf" "$target:$remote_tmp/ks-design.art.conf"
# shellcheck disable=SC2029
ssh "$target" "
  set -euo pipefail
  sudo install -m 0644 '$remote_tmp/ks-design.art.conf' /etc/nginx/sites-available/ks-design.art.conf
  sudo nginx -t
  sudo systemctl reload nginx
  curl --fail --silent --show-error --resolve ks-design.art:443:127.0.0.1 https://ks-design.art/ >/dev/null
"

echo "Installed the ks-design.art Nginx edge and TLS certificate on $target."
