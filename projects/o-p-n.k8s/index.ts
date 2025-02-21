import { Config, getOrganization, getStack, Output, StackReference } from "@pulumi/pulumi";
import { Provider as K8sProvideer } from "@pulumi/kubernetes";

import { K8sModuleRegistry } from "../../modules/k8s/_basics";
import infraCoreStack from "../../modules/k8s/infra-core";
import istioSystemStack from "../../modules/k8s/istio-system";
import certManagerStack from "../../modules/k8s/cert-manager";
import metallbStack from "../../modules/k8s/metallb";

import publicIngressStack from "../../modules/k8s/public-ingress";
import certificatesStack from "../../modules/k8s/certificates";
import monitoringStack from "../../modules/k8s/monitoring";

const config = new Config("o-p-n");

interface ComputeOutputs {
  version: Output<string>;
  kubeconfig: Output<string>;
}

export = async () => {
  const ref = getStackRef("o-p-n.compute");
  const modules = new K8sModuleRegistry(ref);

  await modules.apply("infraCore", infraCoreStack);
  await modules.apply("istioSystem", istioSystemStack);
  await modules.apply("certManager", certManagerStack);
  await modules.apply("metallb", metallbStack);
  await modules.apply("publicIngress", publicIngressStack);
  await modules.apply("monitoring", monitoringStack);
  await modules.apply("certificates", certificatesStack);

  return modules.deployed;
}

const PROJECT_STACKS = new Map<string, StackReference>();
function getStackRef(project: string): StackReference {
  const org = getOrganization();
  const stack = getStack();
  const path = `${org}/${project}/${stack}`;

  let ref = PROJECT_STACKS.get(path);
  if (!ref) {
    PROJECT_STACKS.set(path, ref = new StackReference(path));
  }

  return ref;
}
