import * as log from "@pulumi/pulumi/log";

import { all, Config, getStack, Output, output, Resource, ResourceOptions } from "@pulumi/pulumi";

import * as command from "@pulumi/command/local";
import * as k8s  from "@pulumi/kubernetes";

import { Kind } from "../../modules/kind";
import { Microk8sCluster, Microk8sConnection } from "../../modules/microk8s";
import { VERSION_CHANNEL, VERSION_FULL } from "../../modules/k8s/version";
import doStack from "../../modules/digitalocean";

const config = new Config("o-p-n");

interface StackOutputs {
  version: Output<string>;
  kubeconfig: Output<string>;
  cidrs?: Output<string[]>;
}

type StackDeployer = (domain: string, resOpts: ResourceOptions, addresses?: Output<string[]>) => Promise<StackOutputs>;

export = async () => {
  const base = config.require("base");
  const domain = config.require("domain");
  const resOpts: ResourceOptions = {};

  let deployer: StackDeployer;
  switch (base) {
    case "kind":
      deployer = deployKind;
      break;
    case "microk8s":
      deployer = deployMicrok8s;
      break;
    case "digitalocean":
      deployer = deployDigitalOcean;
      break;
    default:
      throw new Error(`unsupported base '${base}`);
  }

  const outputs = await deployer(domain, resOpts);
  return outputs;
}

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

async function deployKind(domain: string, resOpts: ResourceOptions): Promise<StackOutputs> {
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
        ]
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
  const mappingCmdCreateStr = kind.id.apply(id => (
`
for node in $(kind get nodes --name="${id}"); do
    docker exec "$node" mkdir -p "${registryDir}"
    cat <<EOF | docker exec -i "$node" cp /dev/stdin "${registryDir}/hosts.toml"
[host."http://${registry.containerName}:${registry.containerPort}"]
EOF
done
`
  ));
  const registryDir = `/etc/containerd/certs.d/${registry.hostName}:${registry.hostPort}`;
  const mappingCmd = new command.Command("kind-local-registry-mapping", {
    create: mappingCmdCreateStr,
  }, { deletedWith: kind });
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
    provider: k8sProvider,
    dependsOn: [mappingCmd, kind],
  });

  return {
    version,
    kubeconfig,
    cidrs,
  };
}

async function deployMicrok8s(domain: string, resOpts: ResourceOptions, defaultCidrs?: Output<string[]>): Promise<StackOutputs> {
  const config = new Config("microk8s");

  const hosts = config.requireObject<string[]>("hosts");
  const remote = config.requireSecretObject<Microk8sConnection>("remote");
  const bastion = config.getSecretObject<Microk8sConnection>("bastion");

  const launchConfig = {
    "version": "0.1.0",
    "addons": [
      { "name": "dns" },
      { "name": "metrics-server" },
    ],
    "extraKubeletArgs": {
      "--cluster-domain": "cluster.local",
      "--cluster-dns": "10.152.183.10",
    },
    "extraSANs": [ domain ],
  };

  const version = output(VERSION_CHANNEL);
  const cluster = new Microk8sCluster(domain, {
    hosts,
    remote,
    bastion,
    launchConfig,
    version,
  }, resOpts);
  const kubeconfig = cluster.kubeconfig;

  const cidrs = defaultCidrs ?? cluster.cidrs.apply((cidrs) => cidrs[0] ?? []);

  return {
    kubeconfig,
    cidrs,
    version,
  };
}

async function deployDigitalOcean(domain: string, resOpts: ResourceOptions): Promise<StackOutputs> {
  const doRes = await doStack();
  const { doks } = doRes;
  const kubeconfig = doks.kubeConfigs.apply(configs => {
    return configs[0].rawConfig
  });

  return {
    version: doks.version,
    kubeconfig,
  }
}
