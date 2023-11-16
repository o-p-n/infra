import * as digitalocean from "@pulumi/digitalocean";

export async function stack(droplet: digitalocean.Droplet) {
  const allIps = [
    "0.0.0.0/0",
    "::/0",
  ];
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
      },
      {
        protocol: "tcp",
        destinationAddresses: allIps,
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
    ],
  });

  return firewall;
}
