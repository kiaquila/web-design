#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
website_dir="$(cd -- "$script_dir/.." && pwd)"
repo_dir="$(git -C "$website_dir" rev-parse --show-toplevel)"
target="${KS_DESIGN_DEPLOY_TARGET:-cz}"
remote_dir="${KS_DESIGN_REMOTE_DIR:-/opt/ks-design-portfolio}"

if [[ ! "$target" =~ ^[a-zA-Z0-9._@-]+$ ]]; then
  echo "Invalid SSH target: $target" >&2
  exit 1
fi
if [[ ! "$remote_dir" =~ ^/opt/[a-z0-9-]+$ ]]; then
  echo "Remote directory must be a single lower-case directory under /opt." >&2
  exit 1
fi

if ! git -C "$repo_dir" diff --quiet || ! git -C "$repo_dir" diff --cached --quiet; then
  echo "Refusing to deploy a dirty working tree." >&2
  exit 1
fi

branch="$(git -C "$repo_dir" branch --show-current)"
revision="$(git -C "$repo_dir" rev-parse HEAD)"
if [[ "$branch" != "main" && "${KS_DESIGN_ALLOW_NON_MAIN:-}" != "true" ]]; then
  echo "Production deploys must come from main (current branch: $branch)." >&2
  exit 1
fi

# The validated remote directory intentionally expands on the client.
# shellcheck disable=SC2029
ssh "$target" "sudo install -d -o \"\$(id -un)\" -g \"\$(id -gn)\" '$remote_dir'"
rsync \
  --archive \
  --delete \
  --exclude dist \
  --exclude node_modules \
  --exclude .wrangler \
  "$website_dir/" "$target:$remote_dir/"

# The validated directory and hexadecimal revision intentionally expand here.
# shellcheck disable=SC2029
ssh "$target" "
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
  sudo docker compose -f production/docker-compose.yml ps
"

echo "Deployed ks-design.art source revision $revision to $target:$remote_dir."
