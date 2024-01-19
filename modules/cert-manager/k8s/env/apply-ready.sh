#! /usr/bin/env bash

set -euo pipefail

kubectl --context=local wait --for=condition=ready clusterIssuer cert-manager
