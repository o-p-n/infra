import * as k8s from "@pulumi/kubernetes";

const namespace = "metallb-system";
const version = "0.14.8";

export default async function metallbStack(provider: k8s.Provider) {
  const ns = new k8s.core.v1.Namespace(namespace, {
    metadata: {
      name: namespace,
      labels: {
        "pod-security.kubernetes.io/enforce": "privileged",
        "pod-security.kubernetes.io/audit": "privileged",
        "pod-security.kubernetes.io/warn": "privileged",
      }
    },
  }, { provider });

  const metallb = new k8s.helm.v3.Release(namespace, {
    chart: "metallb",
    version,
    namespace,
    repositoryOpts: {
      repo: "https://metallb.github.io/metallb",
    },
  });

  return {
    namespace: ns,
    releases: [ metallb ],
    metallb,
  }
}
