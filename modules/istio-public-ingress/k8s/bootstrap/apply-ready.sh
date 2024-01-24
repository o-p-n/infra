#! /usr/bin/env bash

set -euo pipefail

kubectl --context=${ENV} \
  wait --for=condition=Established \
  crd gatewayclasses.gateway.networking.k8s.io

kubectl --context=${ENV} \
  wait --for=condition=Established \
  crd gateways.gateway.networking.k8s.io
