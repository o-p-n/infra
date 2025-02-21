import * as log from "@pulumi/pulumi/log";
import { all, Config, getStack, Output, output, Resource, ResourceOptions } from "@pulumi/pulumi";

import { Kind } from "../../providers/kind";
import { Microk8sCluster, Microk8sConnection } from "../../providers/microk8s";
import { VERSION_CHANNEL, VERSION_FULL } from "../../versions/k8s";
import doStack from "../../modules/digitalocean";

const config = new Config("o-p-n");

interface StackOutputs {
  version: Output<string>;
  kubeconfig: Output<string>;
  cidrs: Output<string[]>;
}

type StackDeployer = (domain: string, resOpts: ResourceOptions, addresses?: Output<string[]>) => Promise<StackOutputs>;

export = async () => {
  const base = config.require("base");
  const domain = config.require("domain");
  const resOpts: ResourceOptions = {};

  let cidrs: Output<string[]> | undefined = undefined;
  if (config.getBoolean("digitalocean")) {
    const doRes = await doStack();
    const droplet = doRes.droplet;
    cidrs = all([
      droplet.ipv4Address,
      droplet.ipv6Address,
    ]).apply(([ipv4, ipv6]) => [
      `${ipv4}/32`,
      `${ipv6}/128`,
    ]);
    resOpts.dependsOn = droplet;
    resOpts.deletedWith = droplet;
  }
  
  log.info(`deploying ${base} for ${getStack()}`);

  let deployer: StackDeployer;
  switch (base) {
    case "kind":
      deployer = deployKind;
      break;
    case "microk8s":
      deployer = deployMicrok8s;
      break;
    default:
      throw new Error(`unsupported base '${base}`);
  }

  const outputs = await deployer(domain, resOpts, cidrs);
  // if (!outputs.addresses) {
  //   outputs.addresses = output([]);
  // }
  return outputs;
}

async function deployKind(domain: string, resOpts: ResourceOptions, _cidrs?: Output<string[]>): Promise<StackOutputs> {
  const version = output(VERSION_FULL);
  const launchConfig = {
    kind: "Cluster",
    apiVersion: "kind.x-k8s.io/v1alpha4",
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
