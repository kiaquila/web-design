#!/usr/bin/env bash
# Root-owned forced command for the GitHub Actions deploy key. It admits only
# the narrow staging and wrapper calls made by deploy.sh; it never exposes a
# shell, port forwarding, or an arbitrary remote command to ksdeploy.
set -euo pipefail

command="${SSH_ORIGINAL_COMMAND:-}"
wrapper="/usr/local/sbin/ks-production-deploy"
sha='[a-f0-9]{40}'
run_id='[0-9]+'
stage='/var/lib/ks-production/staging/ks-[a-f0-9]{40}-[a-zA-Z0-9._-]+'

if [[ "$command" =~ ^sudo\ $wrapper\ register\ ($sha)\ ($sha)\ ($run_id)$ ]]; then
  exec sudo "$wrapper" register "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}"
fi
if [[ "$command" =~ ^sudo\ $wrapper\ deploy\ ($sha)\ ($sha)\ ($run_id)\ ($stage)$ ]]; then
  exec sudo "$wrapper" deploy \
    "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}" "${BASH_REMATCH[4]}"
fi
if [[ "$command" =~ ^umask\ 077\;\ mkdir\ ($stage)$ ]]; then
  umask 077
  exec mkdir "${BASH_REMATCH[1]}"
fi
if [[ "$command" =~ ^tar\ -xf\ -\ -C\ ($stage)$ ]]; then
  exec tar -xf - -C "${BASH_REMATCH[1]}"
fi
if [[ "$command" =~ ^rm\ -rf\ --\ ($stage)$ ]]; then
  exec rm -rf -- "${BASH_REMATCH[1]}"
fi

echo "Rejected SSH command." >&2
exit 126
