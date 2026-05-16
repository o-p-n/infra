#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine SSH agent socket mount path based on host OS
if [[ "$(uname -s)" == "Darwin" ]]; then
  SSH_AGENT_HOST_PATH="/run/host-services/ssh-auth.sock"
else
  SSH_AGENT_HOST_PATH="${SSH_AUTH_SOCK}"
fi

docker run --rm -it \
  --network=host \
  -v "${SCRIPT_DIR}":/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "${SSH_AGENT_HOST_PATH}":/ssh-agent \
  -e SSH_AUTH_SOCK="/ssh-agent" \
  o-p-n/ansible:latest \
  ansible-playbook -i /workspace/inventory /workspace/playbook.yml "$@"
