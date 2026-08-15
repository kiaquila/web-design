#!/usr/bin/env bash
# One-time root setup for the GitHub-hosted KS production deploy path.
set -euo pipefail

deploy_key="${1:-}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_user="ksdeploy"
staging_dir="/var/lib/ks-production/staging"
wrapper_source="$script_dir/server-deploy.sh"
wrapper_target="/usr/local/sbin/ks-production-deploy"
sudoers_file="/etc/sudoers.d/ks-production-deploy"

fail() {
  echo "$*" >&2
  exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "Run this one-time installer with sudo."
[[ -f "$wrapper_source" ]] || fail "Missing server-deploy.sh next to this installer."
[[ "$deploy_key" =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+([[:space:]].*)?$ ]] ||
  fail "Pass one SSH Ed25519 public key as the only argument."

if ! id "$deploy_user" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$deploy_user"
fi

install -d -o "$deploy_user" -g "$deploy_user" -m 0700 "/home/$deploy_user/.ssh"
printf '%s\n' "$deploy_key" > "/home/$deploy_user/.ssh/authorized_keys"
chown "$deploy_user:$deploy_user" "/home/$deploy_user/.ssh/authorized_keys"
chmod 0600 "/home/$deploy_user/.ssh/authorized_keys"

install -d -o "$deploy_user" -g "$deploy_user" -m 0700 "$staging_dir"
install -o root -g root -m 0755 "$wrapper_source" "$wrapper_target"

tmp_sudoers="${sudoers_file}.tmp.$$"
printf '%s\n' \
  "$deploy_user ALL=(root) NOPASSWD: $wrapper_target *" > "$tmp_sudoers"
chmod 0440 "$tmp_sudoers"
visudo -cf "$tmp_sudoers"
mv -f "$tmp_sudoers" "$sudoers_file"

echo "Installed restricted production deploy access for $deploy_user."
