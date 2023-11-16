#! /bin/bash

set -euo pipefail

CONFIG_BASE_DIR="$( realpath $( dirname "${BASH_SOURCE[0]}" ) )"

function log() {
  echo "$*" > /dev/stderr
}

function decrypt() {
  local base_dir=$1
  local identity="${CONFIG_BASE_DIR}/${ENVIRONMENT}.key"

  if [ ! -f "${identity}" ] ; then
    log "decryption key for ${ENVIRONMENT} not found\!"
    exit 1
  fi

  DECRYPTED=()
  log "decrypting secrets..."

  for enc in $(find "${base_dir}" -name "*.sops") ; do
    local base=$(basename "$enc" ".sops")
    local dec="${base_dir}/${base}"
    log "   decrypting ${enc} --> ${dec}"
    ${!INFRA_PRIVATAE_${ENVIRONMENT}} sops --decrypt "${enc}" > "${dec}"
    DECRYPTED+=("${dec}")
  done
}

function decrypt_cleanup() {
  local base_dir=$1

  if [[ ${DECRYPTED+x} == "" ]] ; then
    log "no decrypted secrets to cleanup"
    return
  fi

  log "cleaning up decrypted secrets..."

  for dec in "${DECRYPTED[*]}" ; do
    if [[ "${dec}" == "" ]] ; then
      continue
    fi
    log "   cleaning up ${dec}"
    rm -rf "${dec}"
  done

  DECRYPTED=()
}

function apply() {
  local kustomization=$1

  decrypt $kustomization

  log ""

  kubectl apply --wait -k "${kustomization}"

  log ""

  decrypt_cleanup $kustomization
}

usage() {
  log "Usage: $0 [-B] <app> <env>"
  exit 1
}

BOOTSTRAP=""

while getopts "B" OPTION; do
  case "${OPTION}" in
    "B")
      BOOTSTRAP="yes"
      ;;
    *)
      usage
      ;;
  esac
done
shift $((OPTIND-1))

APPLICATION=$1
ENVIRONMENT=$2

if [ "${APPLICATION}" == "" ] || [ "${ENVIRONMENT}" == "" ] ; then
  usage
fi

pushd "${CONFIG_BASE_DIR}/${APPLICATION}" > /dev/null

ENV_DIR="env/${ENVIRONMENT}"

if [ ! -d "${ENV_DIR}" ] ; then
  log "environment ${ENVIRONMENT} not defined"
  exit 3
fi

if [ -d "bootstrap" ] && [ "${BOOTSTRAP}" == "yes" ] ; then
  log "apply bootstrap kustomization ..."
  apply "bootstrap"

  log ""
  log "waiting 20 seconds before continuing ..."
  sleep 20
fi

log "apply environment ${ENVIRONMENT} kustomization ..."
apply "${ENV_DIR}"

popd > /dev/null
