import { Config, CustomResourceOptions, Resource } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { ModuleResult, ModuleResultSet } from "../_basics";

const version = "72.2.0";
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
    version,
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
          "istio.io/dataplane-mode": "ambient",
        },
      },
      prometheus: {
        prometheusSpec: {
          podMonitorSelectorNilUsesHelmValues: false,
          serviceMonitorSelectorNilUsesHelmValues: false,
        },
      },
    },
  }, {
    dependsOn: ns,
    provider,
  });

  const monitors: Resource[] = [];
  if (deployed["istioSystem"]) {
    monitors.push(...istioMonitors(deployed["istioSystem"], {
      provider,
      dependsOn: [ prometheus ],
    }));
  }

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

function istioMonitors(istio: ModuleResult, opts: CustomResourceOptions): Resource[] {
  const namespace = istio.namespace!;
  const istiodMonitor = new k8s.apiextensions.CustomResource("istio-component-monitor", {
    apiVersion: "monitoring.coreos.com/v1",
    kind: "ServiceMonitor",
    metadata: {
      name: "istio-component-monitor",
      namespace: namespace.metadata.name,
      labels: {
        monitoring: "istiod",
        release: "istio",
      }
    },
    spec: {
      jobLabel: "istiod-stats",
      targetLabels: [ "app" ],
      selector: {
        matchLabels: {
          app: "istiod",
        },
      },
      endpoints:[
        {
          port: "http-monitoring",
          interval: "15s",
        },
      ],
    }
  }, {
    ...opts,
  });

  const ztunnelMonitor = new k8s.apiextensions.CustomResource("istio-ztunnel-monitor", {
    apiVersion: "monitoring.coreos.com/v1",
    kind: "PodMonitor",
    metadata: {
      name: "istio-ztunnel-monitor",
      namespace: namespace.metadata.name,
      labels: {
        monitoring: "istio-ztunnels",
        release: "istio",
      },
    },
    spec: {
      selector: {
        matchLabels: {
          app: "ztunnel",
        },
      },
      jobLabel: "ztunnel-stats",
      podTargetLabels: [ "app" ],
      podMetricsEndpoints: [
        {
          targetPort: 15020,
          path: "/metrics",
          interval: "15s",
        },
      ],
    },
  }, {
    ...opts,
  })

  return [
    istiodMonitor,
    ztunnelMonitor,
  ];
}
