import * as k8s from "@pulumi/kubernetes";

const version = "1.25.1";
const namespace = "istio-system";
const repositoryOpts = {
  repo: "https://istio-release.storage.googleapis.com/charts",
};

export default async function stack(provider: k8s.Provider) {
  const ns = new k8s.core.v1.Namespace(namespace, {
    metadata: {
      name: namespace,
    },
  }, { provider });
  
  const base = new k8s.helm.v3.Release(`${namespace}.base`, {
    chart: "base",
    version,
    namespace,
    repositoryOpts,
  }, {
    dependsOn: ns,
    provider,
  });
  const istiod = new k8s.helm.v3.Release(`${namespace}.istiod`, {
    chart: "istiod",
    version,
    namespace,
    repositoryOpts,
  }, {
    dependsOn: [ ns, base ],
    provider,
  });

  return {
    namespace: ns,
    releases: [ base, istiod ],
    base,
    istiod,
  }
}
