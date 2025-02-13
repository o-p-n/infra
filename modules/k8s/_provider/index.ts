import * as k8s from "@pulumi/kubernetes";
import { Output, getStack } from "@pulumi/pulumi";

export async function getProvider() {
  const stack = getStack();
  const mod = await import(`./${stack}`);
  const modProviderArgs = await mod.default() as k8s.ProviderArgs;
  const providerArgs: k8s.ProviderArgs = {
    ...modProviderArgs,
    deleteUnreachable: true,
  };

  return new k8s.Provider("k8s-provider", modProviderArgs);
}
