# outer-planes.net Kubernetes Infrastructure

## ORDER

Kubernetes components are best installed in the following order:

1. `metallb`
2. `istio-system`
3. `cert-manager`
4. `kube-state-metrics`
5. `istio-public-ingress`
6. `monitoring`

Then applications (e.g., `website`) can be installed.
