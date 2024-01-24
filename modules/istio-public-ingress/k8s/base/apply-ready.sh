#! /usr/bin/env bash

set -euo pipefail

kubectl --context=${ENV} --namespace=istio-public-ingress \
  wait --for=condition=ready \
  certificate gateway

kubectl --context=${ENV} --namespace=istio-public-ingress \
  wait --for=condition=programmed \
  gateway gateway
