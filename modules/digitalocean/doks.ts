import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";

export default async function k8sStack() {
  const doks = new digitalocean.KubernetesCluster("o-p-n", {
    version: "1.32.2-do.0",
    region: digitalocean.Region.SFO3,
    nodePool: {
      name: "default",
      size: "s-4vcpu-8gb",
      nodeCount: 2,
    },
    autoUpgrade: true,
    maintenancePolicy: {
      day: "saturday",
      startTime: "10:00",
    }
  });

  const k8sProvider = new k8s.Provider("doks-provider", {
    kubeconfig: doks.kubeConfigs[0].apply(cfg => cfg.rawConfig),
  });
  const ciliumConfigPatch = new k8s.core.v1.ConfigMapPatch("cilium-config-patch", {
    metadata: {
      namespace: "kube-system",
      name: "cilium-config",
    },
    data: {
      "enable-bpf-masquerade": "false",
    },
  }, {
    provider: k8sProvider,
  });

  return doks;
}
