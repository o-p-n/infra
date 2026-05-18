#! /usr/bin/env bash

set -euo pipefail

IMAGE="o-p-n/ansible:latest"
PROJECT_DIR="$(pwd)"


DOCKER_SSH_OPTS=""
case $(uname -s) in
  "Darwin")
    DOCKER_SSH_OPTS="-v /run/host-services/ssh-auth.sock:/ssh-agent -e SSH_AUTH_SOCK=/ssh-agent"
    ;;
  "Linux")
    DOCKER_SSH_OPTS="-v ${SSH_AUTH_SOCK}:/ssh-agent -e SSH_AUTH_SOCK=/ssh-agent"
    ;;
esac

docker run --rm -ti \
  --network=host \
  ${DOCKER_SSH_OPTS} \
  -v "${PROJECT_DIR}:/workspace:rw" \
  "${IMAGE}" \
  "$@"
