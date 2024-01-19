#! /usr/bin/env bash

set -euo pipefail

kubectl --context=${ENV} \
  wait --for=condition=Established \
  crd certificates.cert-manager.io

kubectl --context=${ENV} \
   --namespace cert-manager \
  wait --for=condition=ready pod \
  -l app=webhook

kubectl --context=${ENV} \
  --namespace cert-manager \
  wait --for=condition=ready pod \
  -l app=cainjector

kubectl --context=${ENV} \
  --namespace cert-manager \
  wait --for=condition=ready pod \
  -l app=cert-manager

# wait for a dry-run clusterIssuer ...
SPEC=$(cat << 'EOFEOFEOF'
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: self-test-issuer
spec:
  selfSigned: {}
EOFEOFEOF
)

while ! echo "${SPEC}" | kubectl --context=${ENV} apply --dry-run=server -f -  > /dev/null 2>&1 ; do
  echo "Waiting for dry-run clusterIssuer ..."
  sleep 5
done
