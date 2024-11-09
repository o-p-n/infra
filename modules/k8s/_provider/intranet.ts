import * as pulumi from "@pulumi/pulumi";
import * as YAML from "yaml";
import { Microk8sCluster, Microk8sConnection } from "../../../providers/microk8s";

const config = new pulumi.Config();

export default async function stack() {
  const domain = "outer-planes.casa";
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
    host: "outer-planes.casa",
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
  });

  return {
    kubeconfig: cluster.kubeconfig,
  }
}
