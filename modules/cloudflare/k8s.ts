import * as cf from "@pulumi/cloudflare";
import * as k8s from "@pulumi/kubernetes";
import { Config, Output, Resource } from "@pulumi/pulumi";

import { ModuleResult, ModuleResultSet } from "../k8s/_basics";

import dashboards from "./dashboards";

const namespace = "cloudflare";
const version = "2025.6.1";

type TokenResult = cf.GetZeroTrustTunnelCloudflaredTokenResult;

export default function k8sStack(
  token: Output<TokenResult>,
  provider: k8s.Provider,
  deployed: ModuleResultSet,
): ModuleResult {
  const opts = {
    provider,
  };

  const ns = new k8s.core.v1.Namespace(namespace, {
    metadata: {
      name: namespace,
    },
  }, opts);

  const resources: Resource[] = [];

  const metricsPort = 20244;
  const tunnelConfig = token.apply((result) => {
    const { tunnelId, token } = result;

    return `
tunnel: ${tunnelId}
token: ${token}
metrics: 0.0.0.0:${metricsPort}
no-autoupdate: true
`.trim();
  });

  const configSecret = new k8s.core.v1.Secret(`${namespace}-config`, {
    metadata: {
      namespace,
      name: "tunnel-config",
    },
    type: "generic",
    stringData: {
      "config.yaml": tunnelConfig,
    },
  }, opts);
  resources.push(configSecret);

  const deployment = new k8s.apps.v1.Deployment(`${namespace}-cloudflared`, {
    metadata: {
      namespace,
      name: "cloudflared",
    },
    spec: {
      replicas: 2,
      selector: {
        matchLabels: {
          app: "cloudflared",
        },
      },
      template: {
        metadata: {
          labels: {
            app: "cloudflared",
          },
        },
        spec: {
          containers: [
            {
              name: "cloudflared",
              image: `docker.io/cloudflare/cloudflared:${version}`,
              args: [
                "tunnel",
                "--config",
                "/etc/cloudflared/config.yaml",
                "run",
              ],
              resources: {
                limits: {
                  cpu: "1",
                  memory: "512Mi",
                },
                requests: {
                  cpu: "500m",
                  memory: "64Mi",
                },
              },
              livenessProbe: {
                httpGet: {
                  path: "/ready",
                  port: metricsPort,
                },
                failureThreshold: 2,
                initialDelaySeconds: 10,
                periodSeconds: 10,
              },
              volumeMounts: [
                {
                  name: "config",
                  mountPath: "/etc/cloudflared",
                  readOnly: true,
                },
              ],
              ports: [
                {
                  name: "cf-stats",
                  containerPort: 20244,
                  protocol: "TCP",
                },
              ],
            },
          ],
          volumes: [
            {
              name: "config",
              secret: {
                secretName: configSecret.metadata.name,
              },
            },
          ],
        },
      },
    },
  }, opts);
  resources.push(deployment);

  const monitor = new k8s.apiextensions.CustomResource(`${namespace}-monitor`, {
    apiVersion: "monitoring.coreos.com/v1",
    kind: "PodMonitor",
    metadata: {
      namespace,
      name: "cloudflared-monitor",
      labels: {
        monitoring: "cloudflared",
      },
    },
    spec: {
      selector: {
        matchLabels: {
          app: "cloudflared",
        },
      },
      jobLabel: "cf-stats",
      podTargetLabels: [ "app" ],
      podMetricsEndpoints: [
        {
          portNumber: 20244,
          path: "/metrics",
          interval: "10s",
        },
      ],
    },
  }, opts);
  resources.push(monitor);

  for (const [key, content] of Object.entries(dashboards)) {
    const data: Record<string, string> = {};
    data[`${key}.json`] = content;
    const dashboard = new k8s.core.v1.ConfigMap(`${namespace}-dashboard-${key}`, {
      metadata: {
        namespace,
        name: key,
        labels: {
          "grafana_dashboard": "1",
        },
      },
      data,
    }, opts);
  }

  return {
    namespace: ns,
    resources,
  };
}
