import { all, ComponentResource, ComponentResourceOptions, Input, output, Output, secret } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as command from "@pulumi/command/local";

import { KindInstance, LaunchConfigType } from "./instance";

export interface RegistryConfig {
  hostName: string;
  hostPort: number;
  containerName: string;
  containerPort: number;
}

export interface KindClusterArgs {
  name?: Input<string>;
  configPath: Input<string>;
  launchConfig?: Input<LaunchConfigType>;
  registry?: Input<RegistryConfig>;
  version?: Input<string>,
}

export class KindCluster extends ComponentResource {
  kubeconfig: Output<string>;
  cidrs: Output<string[]>;

  constructor(domain: string, args: KindClusterArgs, opts?: ComponentResourceOptions) {
    super("o-p-n:kind:Cluster", domain, {}, opts);

    const kind = new KindInstance(
      domain,
      {
      ...args,
      },
    );
    const kubeconfig = kind.kubeconfig;
    const cidrs = kind.cidrs;

    const provider = new k8s.Provider(
      `${domain}-provider`,
      { kubeconfig },
    );

    if (args.registry) {
      all([kind.id, args.registry]).apply(([id, registry]) => {
        const path = `/etc/containerd/certs.d/${registry.hostName}:${registry.hostPort}`;
        const exec = `
for node in $(kind get nodes --name="${id}"); do
  docker exec "$node" mkdir -p "${path}"
  cat <<EOF | docker exec -i "$node" cp /dev/stdin "${path}/hosts.toml"
[host."http://${registry.containerName}:${registry.containerPort}"]
EOF
done`;
        new command.Command(
          `${domain}-hosting`,
          {
            create: exec,
          },
          {
            dependsOn: [ kind ],
          },
        );

        new k8s.core.v1.ConfigMap(
          `${domain}-local-registry`,
          {
            metadata: {
              name: "local-registry-hosting",
              namespace: "kube-public",
            },
            data: {
              "localRegistryHosting.v1": `
host: ${registry.hostName}:${registry.hostPort}
help: "https://kind.sigs.k8s.io/docs/user/local-registry/"`,
            },
          },
          {
            provider,
            deletedWith: kind,
          });
      });
    }

    new k8s.helm.v3.Release(
      `${domain}-metrics`,
      {
        name: domain.replace('.', '--'),
        chart: "metrics-server",
        version: "3.12.2",
        namespace: "kube-system",
        repositoryOpts: {
          repo: "https://kubernetes-sigs.github.io/metrics-server",
        },
        values: {
          args: ["--kubelet-insecure-tls"],
        },
      }, {
        provider,
        dependsOn: [ kind ],
      });

    this.kubeconfig = secret(kubeconfig);
    this.cidrs = cidrs;
    this.registerOutputs();
  }
}

