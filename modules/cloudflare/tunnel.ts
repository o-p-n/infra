import * as cf from "@pulumi/cloudflare";
import { getStack, Config } from "@pulumi/pulumi";

const config = new Config("o-p-n");

export default function tunnelStack(accountId: string, zone: cf.Zone) {
  const zoneId = zone.id;
  const domain = config.require("domain");
  const stack = getStack();
  
  const tunnel = new cf.ZeroTrustTunnelCloudflared("ingress-tunnel", {
    accountId,
    name: `${stack}-ingress`,
  });

  const tunnelHostname = tunnel.id.apply((id) => `${id}.cfargotunnel.com`);
  const token = cf.getZeroTrustTunnelCloudflaredTokenOutput({
    accountId,
    tunnelId: tunnel.id,
  });

  const ingressSettings = {
    service: "https://gateway-istio.public-ingress.svc.cluster.local",
    originRequest: {
      noTlsVerify: true,
    },
  };
  const ingress = new cf.ZeroTrustTunnelCloudflaredConfig("ingress-config", {
    accountId,
    tunnelId: tunnel.id,
    config: {
      ingresses: [
        {
          ...ingressSettings,
          hostname: domain,
        },
        {
          ...ingressSettings,
          hostname: `*.${domain}`,
        },
      ],
    },
  });

  const root = new cf.DnsRecord("root", {
    zoneId,
    type: "CNAME",
    name: "@",
    ttl: 300,
    proxied: true,
    content: tunnelHostname,
  });

  const wildcard = new cf.DnsRecord("wildcard", {
    zoneId,
    type: "CNAME",
    name: "*",
    ttl: 300,
    proxied: true,
    content: tunnelHostname,
  });

  return {
    resource: tunnel,
    token,
    root,
    wildcard,
  };
}
