import * as k8s from "@pulumi/kubernetes";

const namespace = "cert-manager";
const version = "1.16.1";

export default async function stack(provider: k8s.Provider) {
  const ns = new k8s.core.v1.Namespace(namespace, {
    metadata: {
      name: namespace,
    },
  }, { provider });
  
  const certManager = new k8s.helm.v3.Release(`${namespace}`, {
    chart: "cert-manager",
    version,
    namespace,
    repositoryOpts: {
      repo: "https://charts.jetstack.io",
    },
    values: {
      crds: { enabled: true },
    },
  }, {
    dependsOn: ns,
    provider,
  });

  return {
    namespace: ns,
    releases: [ certManager ],
    certManager,
  }
}
