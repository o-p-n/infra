#! /usr/bin/env bash

set -euo pipefail

kubectl --namespace=monitoring \
  wait --for=condition=ready pod \
  -l app.kubernetes.io/component=exporter -l app.kubernetes.io/name=node-exporter

kubectl --namespace=monitoring \
  wait --for=condition=ready pod \
  -l app=prometheus-server

kubectl --namespace=monitoring \
  wait --for=condition=ready pod \
  -l app=grafana
