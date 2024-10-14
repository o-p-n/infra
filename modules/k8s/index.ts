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
    console.log(`output namespace!`);
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

export default async function stack() {
  const stackName = pulumi.getStack();

  const provider = await getProvider();

  const infraCore = outputStack(await infraCoreStack(provider));
  const istioSystem = outputStack(await istioSystemStack(provider));
  const certManager = outputStack(await certManagerStack(provider));
  const monitoring = outputStack(await monitoringStack(provider));

  const metallb = (stackName !== "local") ?
    outputStack(await metallbStack(provider)) :
    pulumi.output(undefined);

  return {
    infraCore,
    istioSystem,
    certManager,
    monitoring,
    metallb,
  };
}
