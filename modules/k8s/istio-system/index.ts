import * as k8s from "@pulumi/kubernetes";
import { Config } from "@pulumi/pulumi";

const version = "1.25.2";
const namespace = "istio-system";
const repositoryOpts = {
  repo: "https://istio-release.storage.googleapis.com/charts",
};

export default async function stack(provider: k8s.Provider) {
  const computeBase = new Config("o-p-n").get("compute-base");

  const values: Record<string, unknown> = {
    profile: "ambient",
  };
  switch (computeBase) {
    case "microk8s":
      values.global = { platform: "microk8s" };
      break;
    case "minikube":
      values.global = { platform: "minikube" };
  }

  const ns = new k8s.core.v1.Namespace(namespace, {
    metadata: {
      name: namespace,
    },
  }, { provider });
  
  const base = new k8s.helm.v3.Release("istio-base", {
    chart: "base",
    version,
    namespace,
    repositoryOpts,
  }, {
    dependsOn: ns,
    provider,
  });

  const istiod = new k8s.helm.v3.Release("istiod", {
    chart: "istiod",
    version,
    namespace,
    repositoryOpts,
    values,
  }, {
    dependsOn: [ ns, base ],
    provider,
  });
  const cni = new k8s.helm.v3.Release("istio-cni",
  {
    chart: "cni",
    version,
    namespace,
    repositoryOpts,
    values,
  }, {
    dependsOn: [ ns, base ],
    provider,
  });
  const ztunnel = new k8s.helm.v3.Release("ztunnel",
  {
    chart: "ztunnel",
    version,
    namespace,
    repositoryOpts,
  },
  {
    dependsOn: [ ns, base, cni, istiod ],
    provider,
  });

  return {
    namespace: ns,
    releases: [ base, istiod, cni, ztunnel ],
    base,
    istiod,
    cni,
    ztunnel,
  }
}
``
