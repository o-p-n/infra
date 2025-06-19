import * as cf from "@pulumi/cloudflare";
import * as k8s from "@pulumi/kubernetes";
import { Output, Resource } from "@pulumi/pulumi";

import { ModuleResult, ModuleResultSet } from "../k8s/_basics";

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

  const secret = new k8s.core.v1.Secret(`${namespace}-creds`, {
    metadata: {
      namespace,
      name: "tunnel-creds",
    },
    type: "generic",
    stringData: {
      "config.yaml": tunnelConfig,
    }
  }, opts);
  resources.push(secret);

  const deployment = new k8s.apps.v1.DaemonSet(`${namespace}-cloudflared`, {
    metadata: {
      namespace,
      name: "cloudfalred",
    },
    spec: {
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
              image: "docker.io/cloudflare/cloudflared:2025.6.1",
              args: [],
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
            },
          ],
          volumes: [
            {
              name: "config",
              secret: {
                secretName: secret.metadata.name,
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
      name: "monitor",
    },
    spec: {
      selector: {
        matchLabels: {
          app: deployment.metadata.name,
        },
      },
      podMetricsEndpoints: [
        {
          targetPort: metricsPort,
        },
      ],
    },
  }, {
    ...opts,
    dependsOn: deployed.monitoring?.dependencies ?? [],
  });

  return {
    namespace: ns,
    resources,
  };
}
