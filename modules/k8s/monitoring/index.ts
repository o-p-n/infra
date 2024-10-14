import * as k8s from "@pulumi/kubernetes";

const namespace = "monitoring";

export default async function stack(provider: k8s.Provider) {
  const ns = new k8s.core.v1.Namespace(namespace, {
    metadata: {
      name: namespace,
      labels: {
        "istio-injection": "enabled",
      }
    },
  }, { provider });

  const prometheus = new k8s.helm.v3.Release(`${namespace}-prometheus`, {
    chart: "kube-prometheus-stack",
    version: "65.2.0",
    namespace,
    repositoryOpts: {
      repo: "https://prometheus-community.github.io/helm-charts",
    },
    values: {
      granana: { enabled: false },
    },
  }, {
    dependsOn: ns,
    provider,
  });

  
  return {
    namespace: ns,
    releases: [ prometheus ],
    prometheus,
  };
}
