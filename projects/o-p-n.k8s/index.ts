import { Config, Output } from "@pulumi/pulumi";

import { K8sModuleRegistry } from "../../modules/k8s/_basics";
import infraCoreStack from "../../modules/k8s/infra-core";
import istioSystemStack from "../../modules/k8s/istio-system";
import certManagerStack from "../../modules/k8s/cert-manager";

import cloudflareStack, { Settings as CFSettings } from "../../modules/cloudflare";
import publicIngressStack from "../../modules/k8s/public-ingress";
import certificatesStack from "../../modules/k8s/certificates";
import monitoringStack from "../../modules/k8s/monitoring";

const config = new Config("o-p-n");

interface ComputeOutputs {
  version: Output<string>;
  kubeconfig: Output<string>;
}

type ModuleEnabledInfo = Record<string, boolean>;
export = async () => {
  const enabled = config.getObject<ModuleEnabledInfo>("enabled") ?? {};

  const modules = new K8sModuleRegistry();

  await modules.apply("infraCore", infraCoreStack);
  await modules.apply("istioSystem", istioSystemStack);
  await modules.apply("certManager", certManagerStack);
  await modules.apply("publicIngress", publicIngressStack);
  await modules.apply("monitoring", monitoringStack);
  await modules.apply("certificates", certificatesStack);

  if (enabled.cloudflare) {
    await modules.apply("cloudflare", cloudflareStack);
  }

  return modules.deployed;
}

