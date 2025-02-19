import * as pulumi from "@pulumi/pulumi";
import { remote } from "@pulumi/command";
import doStack from "../../digitalocean";
import { Microk8sCluster, Microk8sConnection } from "../../../providers/microk8s";
import { VERSION_CHANNEL } from "./version";

const config = new pulumi.Config();
const microk8sConfig = new pulumi.Config("microk8s");

export default async function stack() {
  const domain = config.require("domain");
  const remote = microk8sConfig.requireSecretObject<Microk8sConnection>("remote");
  const bastion = microk8sConfig.getSecretObject<Microk8sConnection>("bastion");

  const digitalocean = await doStack();
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

  // validate server is up and running ...
  const cluster = new Microk8sCluster(domain, {
    hosts: [ domain ],
    remote,
    bastion,
    launchConfig,
    version: VERSION_CHANNEL,
  }, {
    dependsOn: digitalocean.droplet,
  });

  return {
    kubeconfig: cluster.kubeconfig,
  };
}
