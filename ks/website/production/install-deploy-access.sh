#!/usr/bin/env bash
# One-time root setup for the GitHub-hosted KS production deploy path.
set -euo pipefail

deploy_key="${1:-}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_user="ksdeploy"
staging_dir="/var/lib/ks-production/staging"
source_git_dir="/var/lib/ks-production/source.git"
source_remote="git@github.com:kiaquila/web-design.git"
source_key="/root/.ssh/ks-production-source"
source_known_hosts="/root/.ssh/known_hosts"
wrapper_source="$script_dir/server-deploy.sh"
wrapper_target="/usr/local/sbin/ks-production-deploy"
ssh_command_source="$script_dir/ssh-command.sh"
ssh_command_target="/usr/local/sbin/ks-production-ssh-command"
sudoers_file="/etc/sudoers.d/ks-production-deploy"

fail() {
  echo "$*" >&2
  exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "Run this one-time installer with sudo."
[[ -f "$wrapper_source" ]] || fail "Missing server-deploy.sh next to this installer."
[[ -f "$ssh_command_source" ]] || fail "Missing ssh-command.sh next to this installer."
[[ "$deploy_key" =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+([[:space:]].*)?$ ]] ||
  fail "Pass one SSH Ed25519 public key as the only argument."
[[ -f "$source_key" && -f "$source_known_hosts" ]] ||
  fail "Install the root-owned read-only GitHub source key and known_hosts entry first."

if ! id "$deploy_user" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$deploy_user"
fi

install -d -o root -g root -m 0755 "/home/$deploy_user/.ssh"
printf 'restrict,command="%s" %s\n' "$ssh_command_target" "$deploy_key" > "/home/$deploy_user/.ssh/authorized_keys"
chown root:root "/home/$deploy_user/.ssh/authorized_keys"
chmod 0600 "/home/$deploy_user/.ssh/authorized_keys"

# ksdeploy can traverse this parent to its own 0700 staging directory, but it
# cannot list it or read root-owned deployment state and source objects.
install -d -o root -g "$deploy_user" -m 0710 "$(dirname "$source_git_dir")"
install -d -o "$deploy_user" -g "$deploy_user" -m 0700 "$staging_dir"
if [[ ! -d "$source_git_dir" ]]; then
  git init --bare "$source_git_dir"
fi
[[ "$(git --git-dir="$source_git_dir" rev-parse --is-bare-repository)" == "true" ]] ||
  fail "Trusted source directory is not a bare Git repository."
# git init follows the invoking umask. The mirror contains private repository
# history, so it must stay root-traversable only regardless of that umask.
chown root:root "$source_git_dir"
chmod 0700 "$source_git_dir"
if ! git --git-dir="$source_git_dir" remote get-url origin >/dev/null 2>&1; then
  git --git-dir="$source_git_dir" remote add origin "$source_remote"
fi
[[ "$(git --git-dir="$source_git_dir" remote get-url origin)" == "$source_remote" ]] ||
  fail "Trusted source mirror remote is invalid."
GIT_SSH_COMMAND="ssh -i $source_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$source_known_hosts" \
  git --git-dir="$source_git_dir" fetch --force --no-tags origin \
  '+refs/heads/main:refs/remotes/origin/main'
install -o root -g root -m 0755 "$wrapper_source" "$wrapper_target"
install -o root -g root -m 0755 "$ssh_command_source" "$ssh_command_target"

tmp_sudoers="${sudoers_file}.tmp.$$"
printf '%s\n' \
  "$deploy_user ALL=(root) NOPASSWD: $wrapper_target *" > "$tmp_sudoers"
chmod 0440 "$tmp_sudoers"
visudo -cf "$tmp_sudoers"
mv -f "$tmp_sudoers" "$sudoers_file"

echo "Installed restricted production deploy access for $deploy_user."
