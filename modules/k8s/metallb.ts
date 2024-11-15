import * as k8s from "@pulumi/kubernetes";
import { ModuleResultSet } from "./_basics";
import { all, getStack, Input, interpolate, output, Output } from "@pulumi/pulumi";
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

  const addresses = await getAddresses();

  const calicoBgpRes = new k8s.apiextensions.CustomResource("calico-bgp-default", {
    apiVersion: "crd.projectcalico.org/v1",
    kind: "BGPConfiguration",
    metadata: {
      name: "default",
    },
    spec: {
      serviceLoadBalancerIPs: addresses.apply((addrs) => {
        return addrs.map((cidr) => ({ cidr }));
      }),
    },
  }, {
    provider,
  }); 

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
    provider,dependsOn: [
      ns,
      calicoBgpRes,
      ...(deployed.istio?.dependencies ?? []),
    ] });

  const poolRes = new k8s.apiextensions.CustomResource("addr-pool", {
    apiVersion: "metallb.io/v1beta1",
    kind: "IPAddressPool",
    metadata:{
      name: "addr-pool",
      namespace,
    },
    spec: {
      addresses,
    },
  }, {
    provider,
    dependsOn: [ ns, metallb, calicoBgpRes ],
  });

  return {
    namespace: ns,
    releases: [ metallb ],
    resources: [ calicoBgpRes, poolRes ],
    metallb,
  }
}

async function getAddresses(): Promise<Output<string[]>> {
  switch(getStack()) {
    case "intranet":
      return output([ "192.168.68.24/32" ]);
    case "public": {
      const { droplet } = await digitalocean(true);
      
      return all([droplet.ipv4Address, droplet.ipv6Address]).apply(([ipv4, ipv6]) => {
        return [
          `${ipv4}/32`,
          `${ipv6}/128`,
        ];
      });
    }
    default:
      throw new Error("stack not supported");
  }
}
