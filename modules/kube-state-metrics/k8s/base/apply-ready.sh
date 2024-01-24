#! /usr/bin/env bash

set -euo pipefail

kubectl --context=${ENV} wait \
  --namespace=kube-system \
  --for=condition=ready \
  pod \
  -l app.kubernetes.io/name=kube-state-metrics
