#! /usr/bin/env bash

set -euo pipefail

kubectl \
  wait --for=condition=Established \
  crd ipaddresspools.metallb.io

kubectl \
  wait --for=condition=Established \
  crd l2advertisements.metallb.io

kubectl --namespace=metallb-system \
  wait --for=condition=ready \
  pod -l app=metallb -l component=speaker

kubectl --namespace=metallb-system \
  wait --for=condition=ready \
  pod -l app=metallb -l component=controller
