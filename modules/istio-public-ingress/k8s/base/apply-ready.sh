#! /usr/bin/env bash

set -euo pipefail

kubectl --namespace=istio-public-ingress \
  wait --for=condition=programmed \
  gateway gateway

kubectl --namespace=istio-public-ingress \
  wait --for=condition=ready --timeout=300s \
  certificate gateway

