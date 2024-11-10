import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

export default function records(domain: digitalocean.Domain) {
  const ns1 = new digitalocean.DnsRecord("o-p.n_ns1", {
    domain: domain.id,
    name: "@",
    ttl: 1800,
    type: "NS",
    value: "ns1.digitalocean.com.",
  }, {
    protect: true,
  });
  const ns2 = new digitalocean.DnsRecord("o-p.n_ns2", {
    domain: domain.id,
    name: "@",
    ttl: 1800,
    type: "NS",
    value: "ns2.digitalocean.com.",
  }, {
    protect: true,
  });
  const ns3 = new digitalocean.DnsRecord("o-p.n_ns3", {
    domain: domain.id,
    name: "@",
    ttl: 1800,
    type: "NS",
    value: "ns3.digitalocean.com.",
  }, {
    protect: true,
  });

  return [
    ns1, ns2, ns3,
  ];
}
