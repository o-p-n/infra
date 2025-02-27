import * as log from "@pulumi/pulumi/log";

import { all, Config, getStack, Output, output, Resource, ResourceOptions } from "@pulumi/pulumi";

import * as command from "@pulumi/command/local";
import * as k8s  from "@pulumi/kubernetes";

import { StackDeployer, StackOutputs } from "./types";
import deployKind from "./kind";
import deployMicrok8s from "./microk8s";
import doStack from "../../modules/digitalocean";

const config = new Config("o-p-n");

export = async () => {
  const base = config.require("compute-base");
  const domain = config.require("domain");
  const resOpts: ResourceOptions = {};

  let deployer: StackDeployer;
  switch (base) {
    case "kind":
      deployer = deployKind;
      break;
    case "microk8s":
      deployer = deployMicrok8s;
      break;
    case "digitalocean":
      deployer = deployDigitalOcean;
      break;
    default:
      throw new Error(`unsupported base '${base}`);
  }

  const outputs = await deployer(domain, resOpts);
  return outputs;
}

async function deployDigitalOcean(domain: string, resOpts: ResourceOptions): Promise<StackOutputs> {
  const doRes = await doStack();
  const { doks } = doRes;
  const kubeconfig = doks.kubeConfigs.apply(configs => {
    return configs[0].rawConfig
  });

  return {
    version: doks.version,
    kubeconfig,
  }
}
