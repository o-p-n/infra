import { Config } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { ModuleResultSet } from "../_basics";

const namespace = "monitoring";

const projectConfig = new Config("o-p-n");
const monConfig = new Config("monitoring");

export default async function stack(provider: k8s.Provider, deployed: ModuleResultSet) {
  const domain = projectConfig.require("domain");
  const adminPassword = monConfig.require("admin-password");

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
        ingress: {
          enabled: false,
        },
        adminPassword,
        podLabels: {
          "sidecar.istio.io/inject": "true",
        },
      },
    },
  }, {
    dependsOn: ns,
    provider,
  });

  const serviceRes = new k8s.core.v1.Service("grafana-service", {
    metadata: {
      name: "grafana",
      namespace,
    },
    spec: {
      selector: {
        "app.kubernetes.io/name": "grafana",
      },
      ports: [
        {
          port: 3000,
          targetPort: 3000,
        },
      ],
    },
  }, {
    provider,
    dependsOn: [ ns, prometheus ],
  });
  const routeRes = new k8s.apiextensions.CustomResource("grafana-route", {
    apiVersion: "gateway.networking.k8s.io/v1beta1",
    kind: "HTTPRoute",
    metadata: {
      name: "grafana",
      namespace,
    },
    spec: {
      hostnames: [
        `metrics.${domain}`,
      ],
      parentRefs: [
        {
          name: "gateway",
          namespace: "public-ingress",
          sectionName: "https",
        },
      ],
      rules: [
        {
          backendRefs: [
            {
              name: "grafana",
              namespace,
              port: 3000,
            },
          ],
        },
      ],
    },
  }, {
    provider,
    dependsOn: [ serviceRes, ...deployed.publicIngress.dependencies! ],
  });
  
  return {
    namespace: ns,
    releases: [ prometheus ],
    resources: [ serviceRes, routeRes ],
    prometheus,
  };
}
