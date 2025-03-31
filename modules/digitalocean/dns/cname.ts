import * as digitalocean from "@pulumi/digitalocean";

export default function records(domain: digitalocean.Domain) {
  const cname = new digitalocean.DnsRecord("o-p.n_cname-wild", {
    domain: domain.id,
    name: "*",
    ttl: 3600,
    type: "CNAME",
    value: "@",
  }, {
    protect: true,
    dependsOn: [domain] ,
  });

  return [cname];
}
