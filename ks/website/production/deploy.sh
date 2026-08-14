#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
website_dir="$(cd -- "$script_dir/.." && pwd)"
repo_dir="$(git -C "$website_dir" rev-parse --show-toplevel)"
target="${KS_DESIGN_DEPLOY_TARGET:-cz}"
remote_dir="${KS_DESIGN_REMOTE_DIR:-/opt/ks-design-portfolio}"
ssh_config="${KS_DESIGN_SSH_CONFIG:-}"
ssh_options=()

if [[ ! "$target" =~ ^[a-zA-Z0-9._@-]+$ ]]; then
  echo "Invalid SSH target: $target" >&2
  exit 1
fi
if [[ ! "$remote_dir" =~ ^/opt/[a-z0-9-]+$ ]]; then
  echo "Remote directory must be a single lower-case directory under /opt." >&2
  exit 1
fi
if [[ -n "$ssh_config" ]]; then
  if [[ ! -f "$ssh_config" ]]; then
    echo "KS_DESIGN_SSH_CONFIG does not exist: $ssh_config" >&2
    exit 1
  fi
  ssh_options=(-F "$ssh_config")
  export RSYNC_RSH="ssh -F $ssh_config"
fi

if ! git -C "$repo_dir" diff --quiet || ! git -C "$repo_dir" diff --cached --quiet; then
  echo "Refusing to deploy a dirty working tree." >&2
  exit 1
fi

branch="$(git -C "$repo_dir" branch --show-current)"
revision="$(git -C "$repo_dir" rev-parse HEAD)"
expected_revision="${KS_DESIGN_EXPECTED_REVISION:-}"
if [[ -n "$expected_revision" ]]; then
  if [[ ! "$expected_revision" =~ ^[a-f0-9]{40}$ ]]; then
    echo "KS_DESIGN_EXPECTED_REVISION must be a full hexadecimal commit SHA." >&2
    exit 1
  fi
  if [[ "$revision" != "$expected_revision" ]]; then
    echo "Checkout revision $revision does not match expected revision $expected_revision." >&2
    exit 1
  fi
fi
if [[ "$branch" != "main" ]] &&
  [[ "${GITHUB_ACTIONS:-}" != "true" || "${GITHUB_REF:-}" != "refs/heads/main" || "$expected_revision" != "$revision" ]]; then
  echo "Production deploys must come from main (current branch: $branch)." >&2
  exit 1
fi

# Build the payload from the validated commit, never from the working tree.
# This excludes untracked and ignored files (including local credentials) and
# guarantees that the deployed bytes match the image revision label.
payload_dir="$(mktemp -d "${TMPDIR:-/tmp}/ks-design-deploy.XXXXXX")"
trap 'rm -rf -- "$payload_dir"' EXIT
git -C "$repo_dir" archive --format=tar "$revision:ks/website" |
  tar -xf - -C "$payload_dir"

# The validated remote directory intentionally expands on the client.
# shellcheck disable=SC2029
if [[ "$target" == "local" ]]; then
  sudo install -d -o "$(id -un)" -g "$(id -gn)" "$remote_dir"
  rsync --archive --delete "$payload_dir/" "$remote_dir/"
else
  ssh "${ssh_options[@]}" "$target" "sudo install -d -o \"\$(id -un)\" -g \"\$(id -gn)\" '$remote_dir'"
  rsync --archive --delete "$payload_dir/" "$target:$remote_dir/"
fi

# The validated directory and hexadecimal revision intentionally expand here.
deploy_command="
  set -euo pipefail
  before=\"\$(sudo docker ps --filter 'name=^/capsule-zero-' --format '{{.ID}} {{.Names}}' | sort)\"
  cd '$remote_dir'
  sudo env KS_DESIGN_SOURCE_REVISION='$revision' KS_DESIGN_IMAGE_TAG='$revision' \
    docker compose -f production/docker-compose.yml up --build --detach --remove-orphans --wait --wait-timeout 120
  after=\"\$(sudo docker ps --filter 'name=^/capsule-zero-' --format '{{.ID}} {{.Names}}' | sort)\"
  if [[ \"\$before\" != \"\$after\" ]]; then
    echo 'Capsule Zero container set changed during deployment.' >&2
    exit 1
  fi
  curl --fail --silent --show-error http://127.0.0.1:3100/ >/dev/null
  container_id=\"\$(sudo docker compose -f production/docker-compose.yml ps -q portfolio)\"
  if [[ -z \"\$container_id\" ]]; then
    echo 'KS production container was not created.' >&2
    exit 1
  fi
  health=\"\$(sudo docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' \"\$container_id\")\"
  deployed_revision=\"\$(sudo docker inspect --format '{{index .Config.Labels \"org.opencontainers.image.revision\"}}' \"\$container_id\")\"
  if [[ \"\$health\" != 'healthy' ]]; then
    echo \"KS production container is not healthy: \$health\" >&2
    exit 1
  fi
  if [[ \"\$deployed_revision\" != '$revision' ]]; then
    echo \"KS production revision mismatch: expected $revision, received \$deployed_revision\" >&2
    exit 1
  fi
  sudo docker compose -f production/docker-compose.yml ps
"
if [[ "$target" == "local" ]]; then
  bash -c "$deploy_command"
else
  # shellcheck disable=SC2029
  ssh "${ssh_options[@]}" "$target" "$deploy_command"
fi

echo "Deployed ks-design.art source revision $revision to $target:$remote_dir."
