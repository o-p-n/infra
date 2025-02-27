import { Config, output, ResourceOptions } from "@pulumi/pulumi";
import * as command from "@pulumi/command/local";
import * as k8s from "@pulumi/kubernetes";

import { Kind } from "../../modules/kind";
import { StackDeployer, StackOutputs } from "./types";
import { VERSION_FULL } from "../../modules/k8s/version";

interface KindRegistry {
  containerName: string;
  containerPort: number;

  hostName: string;
  hostPort: number;
}

const DEFAULTS_KIND_REGISTRY: Partial<KindRegistry> = {
  containerName: "registry",
  containerPort: 5000,
  hostName: "localhost",
}

export default async function deployKind(domain: string, resOpts: ResourceOptions): Promise<StackOutputs> {
  const config = new Config("kind");
  const registry = {
    ...DEFAULTS_KIND_REGISTRY,
    ...config.requireObject<KindRegistry>("registry"),
  };

  const version = output(VERSION_FULL);
  const launchConfig = {
    kind: "Cluster",
    apiVersion: "kind.x-k8s.io/v1alpha4",
    containerdConfigPatches: [
`[plugins."io.containerd.grpc.v1.cri".registry]
  config_path = "/etc/containerd/certs.d"
`
    ],
    nodes: [
      {
        role: "control-plane",
        extraPortMappings:[
          {
            containerPort: 80,
            hostPort: 80,
            protocol: "TCP",
          },
          {
            containerPort: 443,
            hostPort: 443,
            protocol: "TCP",
          },
        ],
      },
    ]
  }

  const kind = new Kind(domain, {
    configPath: `${process.env["HOME"]}/.kube/local.config`,
    launchConfig,
    version,
  }, resOpts);
  const { kubeconfig, cidrs} = kind;

  const k8sProvider = new k8s.Provider("kind-provider", { kubeconfig });

  // setup local registry mapping
  const registryDir = `/etc/containerd/certs.d/${registry.hostName}:${registry.hostPort}`;
  const mappingCmd = new command.Command("kind-local-registry-mapping", {
    create: kind.id.apply(id => (`
for node in $(kind get nodes --name="${id}"); do
    docker exec "$node" mkdir -p "${registryDir}"
    cat <<EOF | docker exec -i "$node" cp /dev/stdin "${registryDir}/hosts.toml"
[host."http://${registry.containerName}:${registry.containerPort}"]
EOF
done`)),
  }, {
    deleteBeforeReplace: true,
    deletedWith: kind,
    dependsOn: kind,
  });

  const mappingConfigMap = new k8s.core.v1.ConfigMap("kind-local-registry-configmap", {
    metadata: {
      name: "local-registry-hosting",
      namespace: "kube-public",
    },
    data: {
      "localRegistryHosting.v1": `
host: "${registry.hostName}:${registry.hostPort}"
help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
      `
    },
  }, {
    deletedWith: kind,
    provider: k8sProvider,
  });

  const metricsServer = new k8s.helm.v3.Release("metrics-server", {
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
    provider: k8sProvider,
    dependsOn: [kind],
  });

  return {
    version,
    kubeconfig,
    cidrs,
  };
}

