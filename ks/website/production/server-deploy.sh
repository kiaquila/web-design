#!/usr/bin/env bash
# Runs as root through the narrowly-scoped ksdeploy sudo rule. This is the only
# server-side entrypoint allowed to mutate the KS production Compose project.
set -euo pipefail

revision="${1:-}"
ks_tree="${2:-}"
run_id="${3:-}"
staging_dir="${4:-}"
project_dir="/opt/ks-design-portfolio"
state_file="/var/lib/ks-production/latest-candidate"
lock_file="/var/lock/ks-production-deploy.lock"

fail() {
  echo "$*" >&2
  exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "This wrapper must run as root."
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || fail "Invalid source revision."
[[ "$ks_tree" =~ ^[a-f0-9]{40}$ ]] || fail "Invalid ks tree hash."
[[ "$run_id" =~ ^[0-9]+$ ]] || fail "Invalid GitHub Actions run ID."
[[ "$staging_dir" =~ ^/var/lib/ks-production/staging/ks-"$revision"-[a-zA-Z0-9._-]+$ ]] ||
  fail "Invalid staging directory."
[[ -d "$staging_dir" && ! -L "$staging_dir" ]] || fail "Staging directory is missing or unsafe."
[[ "$(stat -c '%U' "$staging_dir")" == "ksdeploy" ]] || fail "Staging directory owner must be ksdeploy."

install -d -o root -g root -m 0700 "$(dirname "$state_file")"
exec 9>"$lock_file"
flock --exclusive 9

latest_run=0
latest_tree=""
if [[ -s "$state_file" ]]; then
  read -r latest_run latest_tree < "$state_file"
  [[ "$latest_run" =~ ^[0-9]+$ && "$latest_tree" =~ ^[a-f0-9]{40}$ ]] ||
    fail "Invalid deployment state file."
fi

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

before="$(docker ps --filter 'name=^/capsule-zero-' --format '{{.ID}} {{.Names}}' | sort)"
install -d -o root -g root -m 0755 "$project_dir"
rsync --archive --delete --chown=root:root "$staging_dir/" "$project_dir/"
cd "$project_dir"
KS_DESIGN_SOURCE_REVISION="$revision" KS_DESIGN_IMAGE_TAG="$revision" \
  docker compose -f production/docker-compose.yml up --build --detach --remove-orphans --wait --wait-timeout 120
after="$(docker ps --filter 'name=^/capsule-zero-' --format '{{.ID}} {{.Names}}' | sort)"
[[ "$before" == "$after" ]] || fail "Capsule Zero container set changed during deployment."

curl --fail --silent --show-error http://127.0.0.1:3100/ >/dev/null
container_id="$(docker compose -f production/docker-compose.yml ps -q portfolio)"
[[ -n "$container_id" ]] || fail "KS production container was not created."
health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container_id")"
deployed_revision="$(docker inspect --format '{{index .Config.Labels \"org.opencontainers.image.revision\"}}' "$container_id")"
[[ "$health" == "healthy" ]] || fail "KS production container is not healthy: $health"
[[ "$deployed_revision" == "$revision" ]] ||
  fail "KS production revision mismatch: expected $revision, received $deployed_revision"
docker compose -f production/docker-compose.yml ps

rm -rf -- "$staging_dir"
echo "KS_PRODUCTION_DEPLOYED"
