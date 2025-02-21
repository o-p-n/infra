import * as k8s from "@pulumi/kubernetes";
import { ModuleResultSet } from "./_basics";
import { Config, Output, Resource, StackReference } from "@pulumi/pulumi";
import digitalocean from "../digitalocean";

const namespace = "metallb-system";
const version = "0.14.8";

const config = new Config("metallb");

export default async function metallbStack(provider: k8s.Provider, deployed: ModuleResultSet, ref: StackReference) {
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

  const cidrs = ref.getOutput("cidrs") as Output<string[]>;
  const resources: Resource[] = [];

  if (config.getBoolean("calico-bgp")) {
    const calicoBgpRes = setupBgpConfig(provider, cidrs);
    resources.push(calicoBgpRes);
}

  const metallb = new k8s.helm.v3.Release(namespace, {
    chart: "metallb",
    version,
    namespace,
    repositoryOpts: {
      repo: "https://metallb.github.io/metallb",
    },
    values: {
      speaker: {
        enabled: false,
      },
    },
  }, {
    provider,
    dependsOn: [
      ns,
      ...resources,
      ...(deployed.istio?.dependencies ?? []),
    ],
  });
  resources.push(metallb);

  const poolRes = new k8s.apiextensions.CustomResource("addr-pool", {
    apiVersion: "metallb.io/v1beta1",
    kind: "IPAddressPool",
    metadata:{
      name: "addr-pool",
      namespace,
    },
    spec: {
      addresses: cidrs,
    },
  }, {
    provider,
    dependsOn: [ ns, ...resources ],
  });
  resources.push(poolRes);

  return {
    namespace: ns,
    releases: [ metallb ],
    resources,
    metallb,
  }
}

function setupBgpConfig(provider: k8s.Provider, cidrs: Output<string[]>) {
  return new k8s.apiextensions.CustomResource("calico-bgp-default", {
    apiVersion: "crd.projectcalico.org/v1",
    kind: "BGPConfiguration",
    metadata: {
      name: "default",
    },
    spec: {
      serviceLoadBalancerIPs: cidrs.apply((cidrs) => {
        return cidrs.map((cidr) => ({ cidr }));
      }),
    },
  }, {
    provider,
  }); 
}
