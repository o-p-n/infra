#! /usr/bin/env bash

set -euo pipefail

kubectl --context=${ENV} \
  wait --for=condition=Established \
  crd ipaddresspools.metallb.io

kubectl --context=${ENV} \
  wait --for=condition=Established \
  crd l2advertisements.metallb.io

kubectl --context=${ENV} --namespace=metallb-system \
  wait --for=condition=ready \
  pod -l app=metallb -l component=speaker

kubectl --context=${ENV} --namespace=metallb-system \
  wait --for=condition=ready \
  pod -l app=metallb -l component=controller
