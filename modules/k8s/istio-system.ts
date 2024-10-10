import * as k8s from "@pulumi/kubernetes";
import { outputs } from "./_util";

const version = "1.23.2";
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
    dependsOn: ns,
    provider,
  });

  return {
    namespace,
    base: outputs(base),
    istiod: outputs(istiod),
  }
}
