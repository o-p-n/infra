import * as log from "@pulumi/pulumi/log";
import { Config, getStack, Input, Output, output, Resource, ResourceOptions } from "@pulumi/pulumi";

import { Kind } from "../../providers/kind";
import { Microk8sCluster, Microk8sConnection } from "../../providers/microk8s";
import { VERSION_CHANNEL, VERSION_FULL } from "../../versions/k8s";
import doStack from "../../modules/digitalocean";

const config = new Config("o-p-n");

interface StackOutputs {
  version: Output<string>;
  kubeconfig: Output<string>;
}

export = async () => {
  const base = config.require("base");
  const domain = config.require("domain");
  const resOpts: ResourceOptions = {};

  if (config.getBoolean("digitalocean")) {
    const doRes = await doStack();
    const droplet = doRes.droplet;
    resOpts.dependsOn = droplet;
    resOpts.deletedWith = droplet;
  }
  
  log.info(`deploying ${base} for ${getStack()}`);

  switch (base) {
    case "kind":
      return await deployKind(domain, resOpts);
    case "microk8s":
      return await deployMicrok8s(domain, resOpts);
    default:
      throw new Error(`unsupported base '${base}`);
  }
}

async function deployKind(domain: string, resOpts?: ResourceOptions): Promise<StackOutputs> {
  const version = output(VERSION_FULL);

  const kind = new Kind(domain, {
    configPath: `${process.env["HOME"]}/.kube/local.config`,
    version,
  }, resOpts);

  return Promise.resolve({
    version,
    kubeconfig: kind.kubeconfig,
  });
}

async function deployMicrok8s(domain: string, resOpts?: ResourceOptions): Promise<StackOutputs> {
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

  return {
    kubeconfig,
    version,
  };
}
