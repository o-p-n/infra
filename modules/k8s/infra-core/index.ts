import * as pulumi from '@pulumi/pulumi';
import * as k8s from "@pulumi/kubernetes";

export default async function stack(provider: k8s.Provider) {
  const infraCore = new k8s.helm.v3.Release("infra-core", {
    chart: __dirname,
  }, { provider });

  return {
    releases: [ infraCore ],
    infraCore,
  };
}

