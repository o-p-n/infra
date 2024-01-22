#! /usr/bin/env bash

set -euo pipefail

kubectl --context=${ENV} wait --for=condition=ready clusterIssuer cert-manager
