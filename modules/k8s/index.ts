import * as pulumi from "@pulumi/pulumi";
import { getProvider } from "./_provider";
import { K8sModuleRegistry } from "./_basics";

import infraCoreStack from "./infra-core";
import istioSystemStack from "./istio-system";
import certManagerStack from "./cert-manager";
import metallbStack from "./metallb";
import monitoringStack from "./monitoring";

const config = new pulumi.Config();

export default async function stack() {
  const enabled = {
    metallb: config.requireBoolean("metallb-enabled"),
  };
  const provider = await getProvider();

  const modules = new K8sModuleRegistry(provider);
  await modules.apply("infraCore", infraCoreStack);
  await modules.apply("istioSystem", istioSystemStack);
  await modules.apply("certManager", certManagerStack);
  await modules.apply("monitoring", monitoringStack);

  if (enabled.metallb) {
    await modules.apply("metallb", metallbStack);
  }

  return modules.deployed;
}
