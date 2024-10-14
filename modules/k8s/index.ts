import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { getProvider } from "./_provider";

import infraCoreStack from "./infra-core";
import istioSystemStack from "./istio-system";
import certManagerStack from "./cert-manager";
import metallbStack from "./metallb";

export default async function stack() {
  const stackName = pulumi.getStack();

  const provider = await getProvider();
  const infraCore = await infraCoreStack(provider);
  const istioSystem = await istioSystemStack(provider);
  const certManager = await certManagerStack(provider);

  const metallb = (stackName !== "local") ?
    await metallbStack(provider) :
    pulumi.output(undefined);

  return {
    infraCore,
    istioSystem,
    certManager,
    metallb,
  };
}
