import * as k8s from "@pulumi/kubernetes";

const version = "1.23.2";
const namespace = "istio-system";
const repositoryOpts = {
  repo: "https://istio-release.storage.googleapis.com/charts",
};

const ns = new k8s.core.v1.Namespace(namespace, {
  metadata: {
    name: namespace,
  },
});

const base = new k8s.helm.v3.Release(`${namespace}.base`, {
  chart: "base",
  version,
  namespace,
  repositoryOpts,
}, {
  dependsOn: ns,
});
const istiod = new k8s.helm.v3.Release(`${namespace}.istiod`, {
  chart: "istiod",
  version,
  namespace,
  repositoryOpts,
}, {
  dependsOn: ns,
});

export {
  ns as namespace,
  base,
  istiod,
};
