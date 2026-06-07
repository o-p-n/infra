#! /usr/bin/env bash

set -euo pipefail

ANSIBLE_REMOTE_USER="${ANSIBLE_REMOTE_USER:-${USER}}"

HOST_OS="$(uname -s)"
case "${HOST_OS}" in

  "Darwin")
    DOCKER_SSH_OPTS="-v /run/host-services/ssh-auth.sock:/ssh-agent -e SSH_AUTH_SOCK=/ssh-agent" 
    ;;

  *)
    DOCKER_SSH_OPTS="-v ${SSH_AUTH_SOCK}:/ssh-agent -e SSH_AUTH_SOCK=/ssh-agent"
    ;;

esac

docker run --rm -ti \
  --network=host \
  ${DOCKER_SSH_OPTS:-} \
  -v "${PWD}:/workspace" \
  -v "/var/run/docker.sock:/var/run/docker.sock" \
  -e "ANSIBLE_REMOTE_USER=${ANSIBLE_REMOTE_USER}" \
  o-p-n/ansible:latest "$@"
