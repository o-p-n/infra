import * as log from "@pulumi/pulumi/log";
import { Config, getStack, Output, output } from "@pulumi/pulumi";

import { Kind } from "../../providers/kind";
import { Microk8sCluster } from "../../providers/microk8s";
import { VERSION_FULL } from "../../versions/k8s";

const config = new Config("o-p-n");

interface StackOutputs {
  version: Output<string>;
  kubeconfig: Output<string>;
}
type StackDeployer = ((domain: string) => Promise<StackOutputs>);

export = async () => {
  const base = config.require("base");
  const domain = config.require("domain");
  
  log.info(`deploying ${base} for ${getStack()}`);

  switch (base) {
    case "kind":
      return await deployKind(domain);
    default:
      throw new Error(`unsupported base '${base}`);
  }
}

async function deployKind(domain: string): Promise<StackOutputs> {
  const version = output(VERSION_FULL);

  const kind = new Kind(domain, {
    configPath: `${process.env["HOME"]}/.kube/local.config`,
    version,
  });

  return Promise.resolve({
    version,
    kubeconfig: kind.kubeconfig,
  });
}

interface RemoteOpts {
  host: string,
  port: number,
  username?: string;
  privateKey?: string;
}

async function deployMicrok8s(domain: string): Promise<StackOutputs> {
  const bastion = config.require("microk8s:bastion");
  const hosts = config.requireObject<string[]>("microk8s:hosts");
  const remote = config.requireSecretObject<RemoteOpts>("microk8s:remote-opts");

  const cluster = new Microk8sCluster(domain, {
    hosts,
  });
}
