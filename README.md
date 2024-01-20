# outer-planes.net Kubernetes Infrastructure

## ORDER

Components are best installed in the following order:

1. `istio-system`
2. `cert-manager`
4. `kube-state-metrics`
3. `istio-public-ingress`
6. `metallb`
5. `monitoring`

Then applications (e.g., `website`) can be installed.
