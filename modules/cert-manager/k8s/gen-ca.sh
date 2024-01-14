#! /usr/bin/env bash

set -euo pipefail

BASE_DIR="$(dirname "${BASH_SOURCE[0]}")"

function log() {
  echo "$*" > /dev/stderr
}

if [[ $(($#)) < 1 ]] ; then
  log "An environment must be specified"
  exit 1
fi

ENVIRONMENT=$1

ENV_DIR="${BASE_DIR}/env/${ENVIRONMENT}"

if [ ! -d "${ENV_DIR}" ] ; then
  log "environment ${ENVIRONMENT} not found"
  exit 1
fi

log "generating ECDSA self-CA for ${ENVIRONMENT}..."
openssl req -new \
    -newkey ec -pkeyopt ec_paramgen_curve:prime256v1  -nodes\
    -x509 -days 3650 \
    -subj "/CN=Cert-Manager ${ENVIRONMENT} Cluster CA/OU=${ENVIRONMENT}/O=outer-planes" \
    -addext "keyUsage = cRLSign, keyCertSign" \
    -out "${ENV_DIR}/tls.crt" -keyout "${ENV_DIR}/tls.key"

openssl x509 -in "${ENV_DIR}/tls.crt" -noout -text
