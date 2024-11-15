import * as pulumi from "@pulumi/pulumi";
import * as YAML from "yaml";
import { Microk8sCluster, Microk8sConnection } from "../../../providers/microk8s";
import { VERSION_CHANNEL } from "./version";

const config = new pulumi.Config();

export default async function stack() {
  const domain = config.require("domain");
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

  const hosts = [
    "elysium-armoria.local",
    "elysium-eronia.local",
    "elysium-belierin.local",
  ];

  const username = config.require("ssh-username");
  const privateKey = config.require("ssh-private-key");
  const bastion: Microk8sConnection = {
    host: domain,
    port: 22,
    username,
    privateKey,
  };

  const cluster = new Microk8sCluster(domain, {
    hosts,
    remote: {
      port: 22,
      username,
      privateKey,
    },
    launchConfig,
    version: VERSION_CHANNEL,
  });

  return {
    kubeconfig: cluster.kubeconfig,
  }
}
