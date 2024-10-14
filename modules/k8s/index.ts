import * as pulumi from "@pulumi/pulumi";
import { getProvider } from "./_provider";
import { K8sModuleRegistry } from "./_basics";

import infraCoreStack from "./infra-core";
import istioSystemStack from "./istio-system";
import certManagerStack from "./cert-manager";
import metallbStack from "./metallb";
import monitoringStack from "./monitoring";

export default async function stack() {
  const stackName = pulumi.getStack();
  const provider = await getProvider();

  const modules = new K8sModuleRegistry(provider);
  await modules.apply("infraCore", infraCoreStack);
  await modules.apply("istioSystem", istioSystemStack);
  await modules.apply("certManager", certManagerStack);
  await modules.apply("monitoring", monitoringStack);

  if (stackName !== "local") {
    await modules.apply("metallb", metallbStack);
  }

  return modules.deployed;
}
