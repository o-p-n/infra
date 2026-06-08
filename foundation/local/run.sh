#! /usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

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

WORKING_TMPDIR=${SCRIPT_DIR}/../../tmp

mkdir -p "${WORKING_TMPDIR}"

docker run --rm -ti \
  --network=host \
  ${DOCKER_SSH_OPTS:-} \
  -v "${PWD}:/workspace:ro" \
  -v "${WORKING_TMPDIR}:/scratch:rw" \
  -v "/var/run/docker.sock:/var/run/docker.sock" \
  -e "ANSIBLE_LOCAL_TMP=$/workspace/temp" \
  -e "ANSIBLE_REMOTE_USER=${ANSIBLE_REMOTE_USER}" \
  -e "TMPDIR=/scratch" \
  o-p-n/ansible:latest "$@"
