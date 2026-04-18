import * as digitalocean from "@pulumi/digitalocean";

export default function firewallStack(droplet: digitalocean.Droplet) {

  const allIps = [
    "0.0.0.0/0",
    "::/0",
  ];
  const allPorts = "1-65535";

  const firewall = new digitalocean.Firewall("o-p.n", {
    dropletIds: [droplet.id.apply((id) => parseInt(id))],
    outboundRules: [
      {
        protocol: "icmp",
        destinationAddresses: allIps,
      },
      {
        protocol: "udp",
        destinationAddresses: allIps,
        portRange: "all",
      },
      {
        protocol: "tcp",
        destinationAddresses: allIps,
        portRange: "all",
      },
    ],
    inboundRules: [
      {
        protocol: "icmp",
        sourceAddresses: allIps,
      },
      {
        protocol: "tcp",
        portRange: "22",
        sourceAddresses: allIps,
      },
      {
        protocol: "tcp",
        portRange: "80",
        sourceAddresses: allIps,
      },
      {
        protocol: "tcp",
        portRange: "443",
        sourceAddresses: allIps,
      },
      {
        protocol: "udp",
        portRange: "443",
        sourceAddresses: allIps,
      },
      {
        protocol: "tcp",
        portRange: "16443",
        sourceAddresses: allIps,
      },
      {
        protocol: "udp",
        portRange: "16443",
        sourceAddresses: allIps,
      },
    ],
  });

  return firewall;
}
