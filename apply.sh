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

  for enc in $(find "${base_dir}" -name "*.age") ; do
    local base=$(basename "$enc" ".age")
    local dec="${base_dir}/${base}"
    log "   decrypting ${enc} --> ${dec}"
    age -d -i "${CONFIG_BASE_DIR}/${ENVIRONMENT}.key" "${enc}" > "${dec}"
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

if [[ $(($#)) < 2 ]] ; then
  log "An app and environment must be specified"
  exit 1
fi

APPLICATION=$1
ENVIRONMENT=$2

pushd "${CONFIG_BASE_DIR}/${APPLICATION}" > /dev/null

ENV_DIR="env/${ENVIRONMENT}"

if [ ! -d "${ENV_DIR}" ] ; then
  log "environment ${ENVIRONMENT} not defined"
  exit 3
fi

if [ -d "bootstrap" ] ; then
  log "apply bootstrap kustomization ..."
  apply "bootstrap"

  log ""
  log "waiting 20 seconds before continuing ..."
  sleep 20
fi

log "apply environment ${ENVIRONMENT} kustomization ..."
apply "${ENV_DIR}"

popd > /dev/null
