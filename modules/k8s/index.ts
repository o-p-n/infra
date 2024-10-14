import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { getProvider } from "./_provider";

import infraCoreStack from "./infra-core";
import istioSystemStack from "./istio-system";
import certManagerStack from "./cert-manager";
import metallbStack from "./metallb";
import monitoringStack from "./monitoring";

interface ComponentInput {
  namespace?: k8s.core.v1.Namespace,
  releases: k8s.helm.v3.Release[],
}

interface ComponentOutput {
  namespace?: pulumi.Output<string>;
  releases?: pulumi.Output<string>[];
}

function outputStack(input: ComponentInput) {
  const result: ComponentOutput = {};

  if (input.namespace) {
    result.namespace = input.namespace.metadata.namespace;
  }

  const releases = input.releases.map((rel) => {
    return pulumi.all([rel.repositoryOpts.repo, rel.name, rel.id]).apply(([repo, name]) => {
      return `${repo ?? ""}/${name}`;
    });
  });
  result.releases = releases;

  return result;
}

class StackDeploy {
  provider: k8s.Provider;
  deployed: Record<string, ComponentOutput> = {};

  constructor(provider: k8s.Provider) {
    this.provider = provider;
  }

  async apply(name: string, fn: (provider: k8s.Provider, deployed?: Record<string, ComponentOutput>) => Promise<ComponentInput>) {
    const input = await fn(this.provider, this.deployed);
    const output = outputStack(input);
    this.deployed[name] = output;
  }
}

export default async function stack() {
  const stackName = pulumi.getStack();
  const provider = await getProvider();

  const deployer = new StackDeploy(provider);
  await deployer.apply("infraCore", infraCoreStack);
  await deployer.apply("istioSystem", istioSystemStack);
  await deployer.apply("certManager", certManagerStack);
  await deployer.apply("monitoring", monitoringStack);

  if (stackName !== "local") {
    await deployer.apply("metallb", metallbStack);
  }

  return deployer.deployed;
}
