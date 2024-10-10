import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

import * as istioSystem from "./istio-system";

const infraCore = new k8s.helm.v3.Release("infra-core", {
  chart: __dirname + "/infra-core",
});

export {
  infraCore,
  istioSystem,
};
