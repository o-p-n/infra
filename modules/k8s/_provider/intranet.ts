import * as pulumi from "@pulumi/pulumi";
import * as YAML from "yaml";
import { Microk8s, Microk8sConnection, Microk8sJoinInfo } from "../../../providers/microk8s";

const config = new pulumi.Config();

export default async function stack() {
  const domain = "outer-planes.casa";
  const launchConfig = YAML.stringify({
    "version": "0.1.0",
    "addons": [
      {
        "name": "dns"
      },
      {
        "name": "metrics-server"
      }
    ],
    "extraKubeletArgs": {
      "--cluster-domain": "cluster.local",
      "--cluster-dns": "10.152.183.10"
    },
    "extraSANs": [ domain ],
  });

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

  let join: pulumi.Output<Microk8sJoinInfo> | undefined;
  let kubeconfig: pulumi.Output<string> | undefined;

  for (const host of hosts) {
    const primary = host === hosts[0];
    const remote = {
      port: 22,
      host,
      username,
      privateKey,
    };
    const resource = new Microk8s(`microk8s-${host}`, {
      launchConfig,
      remote,
      bastion,
      join,
      primary,
    });
    join = join ?? resource.join;
    kubeconfig = kubeconfig ?? resource.kubeconfig;
  }

  kubeconfig = kubeconfig?.apply((cfg) => {
    // fix-up cluster name
    const config = YAML.parse(cfg);

    // fix-up server URL
    const loc = new URL(config.clusters[0].cluster.server);
    loc.hostname = domain;
    config.clusters[0].cluster.server = loc.toString();

    cfg = YAML.stringify(config);
    return cfg;
  });

  return {
    kubeconfig,
  }
}
