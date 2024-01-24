#! /usr/bin/env bash

set -euo pipefail

kubectl --context=${ENV} --namespace=istio-system \
  wait --for=condition=ready pod \
    -l app=istiod
