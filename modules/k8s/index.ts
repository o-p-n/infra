import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { getProvider } from "./_provider";

import istioSystemStack from "./istio-system";
import infraCoreStack from "./infra-core";

export default async function stack() {
  const provider = await getProvider();
  const infraCore = await infraCoreStack(provider);
  const istioSystem = await istioSystemStack(provider);

  return {
    infraCore,
    istioSystem,
  };
}
