#!/usr/bin/env bash
# Runs as root through the narrowly-scoped ksdeploy sudo rule. This is the only
# server-side entrypoint allowed to mutate the KS production Compose project.
set -euo pipefail

command="${1:-}"
project_dir="/opt/ks-design-portfolio"
state_file="/var/lib/ks-production/latest-candidate"
lock_file="/var/lock/ks-production-deploy.lock"
source_git_dir="/var/lib/ks-production/source.git"
source_remote="git@github.com:kiaquila/web-design.git"
source_key="/root/.ssh/ks-production-source"
source_known_hosts="/root/.ssh/known_hosts"

fail() {
  echo "$*" >&2
  exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "This wrapper must run as root."
case "$command" in
  register)
    [[ "$#" -eq 4 ]] || fail "Usage: register <revision> <ks-tree> <run-id>."
    revision="$2"
    ks_tree="$3"
    run_id="$4"
    staging_dir=""
    ;;
  deploy)
    [[ "$#" -eq 5 ]] || fail "Usage: deploy <revision> <ks-tree> <run-id> <staging-dir>."
    revision="$2"
    ks_tree="$3"
    run_id="$4"
    staging_dir="$5"
    ;;
  *)
    fail "Unknown deployment command."
    ;;
esac
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || fail "Invalid source revision."
[[ "$ks_tree" =~ ^[a-f0-9]{40}$ ]] || fail "Invalid ks tree hash."
[[ "$run_id" =~ ^[0-9]+$ ]] || fail "Invalid GitHub Actions run ID."
if [[ "$command" == "deploy" ]]; then
  [[ "$staging_dir" =~ ^/var/lib/ks-production/staging/ks-"$revision"-[a-zA-Z0-9._-]+$ ]] ||
    fail "Invalid staging directory."
  [[ -d "$staging_dir" && ! -L "$staging_dir" ]] || fail "Staging directory is missing or unsafe."
  [[ "$(stat -c '%U' "$staging_dir")" == "ksdeploy" ]] || fail "Staging directory owner must be ksdeploy."
fi

# ksdeploy needs traversal (not listing or reading) to create its staging child.
# Root-owned source and state files remain inaccessible inside this parent.
install -d -o root -g ksdeploy -m 0710 "$(dirname "$state_file")"
exec 9>"$lock_file"
flock --exclusive 9

latest_run=0
latest_tree=""
if [[ -s "$state_file" ]]; then
  read -r latest_run latest_tree < "$state_file"
  [[ "$latest_run" =~ ^[0-9]+$ && "$latest_tree" =~ ^[a-f0-9]{40}$ ]] ||
    fail "Invalid deployment state file."
fi

if [[ "$command" == "register" ]]; then
  if (( run_id < latest_run )); then
    echo "KS_PRODUCTION_DEPLOY_SKIPPED"
    exit 0
  fi
  if (( run_id == latest_run )) && [[ -n "$latest_tree" && "$ks_tree" != "$latest_tree" ]]; then
    fail "Run ID is already associated with a different ks tree."
  fi
  if (( run_id > latest_run )); then
    state_tmp="${state_file}.tmp.$$"
    umask 077
    printf '%s %s\n' "$run_id" "$ks_tree" > "$state_tmp"
    chown root:root "$state_tmp"
    mv -f "$state_tmp" "$state_file"
  fi
  echo "KS_PRODUCTION_DEPLOY_REGISTERED"
  exit 0
fi

if (( run_id != latest_run )); then
  echo "KS_PRODUCTION_DEPLOY_SKIPPED"
  exit 0
fi
[[ "$ks_tree" == "$latest_tree" ]] || fail "Registered deployment tree mismatch."

# The deploy SSH credential may only stage bytes; it cannot choose what Docker
# executes. Fetch the current main tip through a separate root-owned read-only
# GitHub key, require the requested revision and tree to match, and compare the
# staged payload with a fresh archive before copying it into /opt.
[[ -d "$source_git_dir" ]] || fail "Trusted source mirror is missing."
[[ -f "$source_key" && -f "$source_known_hosts" ]] ||
  fail "Trusted source GitHub credentials are missing."
[[ "$(git --git-dir="$source_git_dir" config --get remote.origin.url)" == "$source_remote" ]] ||
  fail "Trusted source mirror remote is invalid."
GIT_SSH_COMMAND="ssh -i $source_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$source_known_hosts" \
  git --git-dir="$source_git_dir" fetch --force --no-tags origin \
  '+refs/heads/main:refs/remotes/origin/main'
trusted_main="$(git --git-dir="$source_git_dir" rev-parse refs/remotes/origin/main)"
git --git-dir="$source_git_dir" cat-file -e "$revision^{commit}" ||
  fail "Requested revision is absent from the trusted source mirror."
[[ "$(git --git-dir="$source_git_dir" rev-parse "$trusted_main:ks")" == "$ks_tree" ]] ||
  fail "Current trusted main ks tree differs from the registered candidate."
[[ "$(git --git-dir="$source_git_dir" rev-parse "$revision:ks")" == "$ks_tree" ]] ||
  fail "Requested revision ks tree does not match the registered candidate."

trusted_payload="$(mktemp -d /var/lib/ks-production/trusted-payload.XXXXXX)"
cleanup() {
  rm -rf -- "$trusted_payload" "$staging_dir"
}
trap cleanup EXIT
git --git-dir="$source_git_dir" archive --format=tar "$revision:ks/website" |
  tar -xf - -C "$trusted_payload"
if ! diff --recursive --brief --no-dereference "$trusted_payload" "$staging_dir"; then
  fail "Staged deployment payload does not match the trusted source revision."
fi

before="$(docker ps --filter 'name=^/capsule-zero-' --format '{{.ID}} {{.Names}}' | sort)"
install -d -o root -g root -m 0755 "$project_dir"
rsync --archive --delete --chown=root:root "$trusted_payload/" "$project_dir/"
cd "$project_dir"
KS_DESIGN_SOURCE_REVISION="$revision" KS_DESIGN_IMAGE_TAG="$revision" \
  docker compose -f production/docker-compose.yml up --build --detach --remove-orphans --wait --wait-timeout 120
after="$(docker ps --filter 'name=^/capsule-zero-' --format '{{.ID}} {{.Names}}' | sort)"
[[ "$before" == "$after" ]] || fail "Capsule Zero container set changed during deployment."

curl --fail --silent --show-error http://127.0.0.1:3100/ >/dev/null
container_id="$(docker compose -f production/docker-compose.yml ps -q portfolio)"
[[ -n "$container_id" ]] || fail "KS production container was not created."
health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container_id")"
deployed_revision="$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$container_id")"
[[ "$health" == "healthy" ]] || fail "KS production container is not healthy: $health"
[[ "$deployed_revision" == "$revision" ]] ||
  fail "KS production revision mismatch: expected $revision, received $deployed_revision"
docker compose -f production/docker-compose.yml ps

echo "KS_PRODUCTION_DEPLOYED"
