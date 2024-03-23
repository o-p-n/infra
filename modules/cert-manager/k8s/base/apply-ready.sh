#! /usr/bin/env bash

set -euo pipefail

kubectl wait --for=condition=ready clusterIssuer cert-manager
