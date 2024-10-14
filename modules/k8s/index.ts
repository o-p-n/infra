import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { getProvider } from "./_provider";

import infraCoreStack from "./infra-core";
import istioSystemStack from "./istio-system";
import certManagerStack from "./cert-manager";

export default async function stack() {
  const provider = await getProvider();
  const infraCore = await infraCoreStack(provider);
  const istioSystem = await istioSystemStack(provider);
  const certManager = await certManagerStack(provider);

  return {
    infraCore,
    istioSystem,
    certManager,
  };
}
