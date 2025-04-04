import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

export default function records(domain: digitalocean.Domain, droplet: digitalocean.Droplet) {
  const dropletAAAA = new digitalocean.DnsRecord("o-p.n_aaaa-host", {
    domain: domain.id,
    name: "@",
    ttl: 30,
    type: "AAAA",
    value: droplet.ipv6Address,
  }, { dependsOn: [domain, droplet] });

  const dropletA = new digitalocean.DnsRecord("o-p.n_a-host", {
    domain: domain.id,
    name: "@",
    ttl: 30,
    type: "A",
    value: droplet.ipv4Address,
  }, { dependsOn: [domain, droplet] });

  return [
    dropletAAAA,
    dropletA,
  ];
}
