import * as digitalocean from "@pulumi/digitalocean";

export default async function k8sStack() {
  const doks = new digitalocean.KubernetesCluster("o-p-n", {
    version: "1.32.2-do.0",
    region: digitalocean.Region.SFO3,
    nodePool: {
      name: "default",
      size: "s-2vcpu-4gb",
      nodeCount: 3,
    },
    autoUpgrade: true,
    maintenancePolicy: {
      day: "saturday",
      startTime: "10:00",
    }
  });

  return doks;
}
