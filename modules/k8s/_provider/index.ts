import * as k8s from "@pulumi/kubernetes";
import { Output, getStack } from "@pulumi/pulumi";

export async function getProvider() {
  const stack = getStack();
  const mod = await import(`./${stack}`);
  const providerArgs = await mod.default() as k8s.ProviderArgs;

  return new k8s.Provider("k8s-provider", providerArgs);
}
