import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

export default function records(domain: digitalocean.Domain) {

  const caa = new digitalocean.DnsRecord("o-p.caa_letsencrypt", {
    domain: domain.id,
    name: "@",
    tag: "issue",
    ttl: 3600,
    type: "CAA",
    value: "letsencrypt.org.",
    flags: 0,
  }, {
      protect: true,
  });

  return pulumi.all([
    caa,
  ]);
}
