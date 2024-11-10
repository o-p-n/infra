import * as k8s from "@pulumi/kubernetes";
import { ModuleResultSet } from "./_basics";
import { getStack } from "@pulumi/pulumi";
import digitalocean from "../digitalocean";

const namespace = "metallb-system";
const version = "0.14.8";

export default async function metallbStack(provider: k8s.Provider, deployed: ModuleResultSet) {
  const ns = new k8s.core.v1.Namespace(namespace, {
    metadata: {
      name: namespace,
      labels: {
        "pod-security.kubernetes.io/enforce": "privileged",
        "pod-security.kubernetes.io/audit": "privileged",
        "pod-security.kubernetes.io/warn": "privileged",
      }
    },
  }, { provider });

  const metallb = new k8s.helm.v3.Release(namespace, {
    chart: "metallb",
    version,
    namespace,
    repositoryOpts: {
      repo: "https://metallb.github.io/metallb",
    },
  }, { provider, dependsOn: [ ns, ...(deployed.istio?.dependencies ?? []) ] });

  const advertRes = new k8s.apiextensions.CustomResource("l2-advertisement", {
    apiVersion: "metallb.io/v1beta1",
    kind: "L2Advertisement",
    metadata:{
      name: "empty",
      namespace,
    }
  }, {
    provider,
    dependsOn: [ ns, metallb ],
  });

  const poolRes = new k8s.apiextensions.CustomResource("addr-pool", {
    apiVersion: "metallb.io/v1beta1",
    kind: "IPAddressPool",
    metadata:{
      name: "addr-pool",
      namespace,
    },
    spec: {
      addresses: await getAddresses(),
    },
  }, {
    provider,
    dependsOn: [ ns, metallb, advertRes ],
  });

  return {
    namespace: ns,
    releases: [ metallb ],
    resources: [ advertRes, poolRes ],
    metallb,
  }
}

async function getAddresses(): Promise<string[]> {
  switch(getStack()) {
    case "intranet":
      return [ "192.168.68.24/32" ];
    case "public": {
      const { droplet } = await digitalocean(true);
      
      return [
        `${droplet.ipv4Address}/32`,
        `${droplet.ipv6Address}/128`,
      ];
    }
    default:
      throw new Error("stack not supported");
  }
}
