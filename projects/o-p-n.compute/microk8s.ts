import { Config, Output, output, ResourceOptions } from "@pulumi/pulumi";

import { StackDeployer, StackOutputs } from "./types";
import { VERSION_CHANNEL } from "../../modules/k8s/version";
import { Microk8sConnection, Microk8sCluster } from "../../modules/microk8s";

export default async function deployMicrok8s(domain: string, resOpts: ResourceOptions, defaultCidrs?: Output<string[]>): Promise<StackOutputs> {
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

