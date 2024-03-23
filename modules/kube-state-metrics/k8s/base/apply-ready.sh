#! /usr/bin/env bash

set -euo pipefail

kubectl wait \
  --namespace=kube-system \
  --for=condition=ready \
  pod \
  -l app.kubernetes.io/name=kube-state-metrics
