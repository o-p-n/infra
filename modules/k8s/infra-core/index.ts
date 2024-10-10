import * as k8s from "@pulumi/kubernetes";
import { outputs } from "../_util";

export default async function stack(provider: k8s.Provider) {
  const release = new k8s.helm.v3.Release("infra-core", {
    chart: __dirname,
  }, { provider });

  return outputs(release);
}

