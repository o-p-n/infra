import * as pulumi from "@pulumi/pulumi";
import { remote } from "@pulumi/command";
import doStack from "../../digitalocean";
import { Microk8s, Microk8sConnection } from "../../../providers/microk8s";

const config = new pulumi.Config();

export default async function stack() {
  const domain = config.require("domain");

  const digitalocean = await doStack();
  const username = config.require("ssh-username");
  const privateKey = config.require("ssh-private-key");
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
  const remote: Microk8sConnection = {
    host: "outer-planes.net",
    port: 22,
    username,
    privateKey,
  };
  const cluster = new Microk8s("public-microk8s", {
    remote,
    launchConfig,
  }, {
    dependsOn: digitalocean.droplet,
  });

  return {
    kubeconfig: cluster.kubeconfig,
  };
}
