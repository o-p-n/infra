import * as pulumi from "@pulumi/pulumi";
import * as YAML from "yaml";
import { Microk8sInstance, Microk8sArgs } from "../../../providers/microk8s/instance";
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
  const cluster = new Microk8sInstance(domain, {
    hostname: domain,
    version: VERSION_CHANNEL,
    launchConfig,
  });

  return {
    kubeconfig: cluster.kubeconfig,
  }
}
