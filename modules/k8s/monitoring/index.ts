import { Config } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const namespace = "monitoring";

const config = new Config();

export default async function stack(provider: k8s.Provider) {
  const adminPassword = config.require("monitoring-admin-password");

  const ns = new k8s.core.v1.Namespace(namespace, {
    metadata: {
      name: namespace,
    },
  }, { provider });

  const prometheus = new k8s.helm.v3.Release(`${namespace}`, {
    chart: "kube-prometheus-stack",
    version: "65.2.0",
    namespace,
    repositoryOpts: {
      repo: "https://prometheus-community.github.io/helm-charts",
    },
    values: {
      grafana: {
        adminPassword,
        podLabels: {
          "sidecar.istio.io/inject": "true",
        }
      },
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
