#! /usr/bin/env bash

set -euo pipefail

kubectl \
  wait --for=condition=Established \
  crd gatewayclasses.gateway.networking.k8s.io

kubectl \
  wait --for=condition=Established \
  crd gateways.gateway.networking.k8s.io

kubectl --namespace=istio-system \
  wait --for=condition=ready pod \
    -l app=istiod
