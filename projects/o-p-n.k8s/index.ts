import { Config, getOrganization, getStack, Output, StackReference } from "@pulumi/pulumi";
import { Provider as K8sProvideer } from "@pulumi/kubernetes";

import { K8sModuleRegistry } from "../../modules/k8s/_basics";
import infraCoreStack from "../../modules/k8s/infra-core";
import istioSystemStack from "../../modules/k8s/istio-system";
import certManagerStack from "../../modules/k8s/cert-manager";

const config = new Config("o-p-n");

interface ComputeOutputs {
  version: Output<string>;
  kubeconfig: Output<string>;
}

export = async () => {
  const registry = await getK8sRegistry();

  await registry.apply("infraCore", infraCoreStack);
  await registry.apply("istioSystem", istioSystemStack);
  await registry.apply("certManager", certManagerStack);

  return registry.deployed;
}

async function getK8sRegistry(): Promise<K8sModuleRegistry> {
  const ref = new StackReference(`${getOrganization()}/o-p-n.compute/${getStack()}`);
  const kubeconfig = ref.getOutput("kubeconfig");

  const provider = new K8sProvideer("k8s-provider", {
    kubeconfig,
  });
  const registry = new K8sModuleRegistry(provider);

  return registry;
}
