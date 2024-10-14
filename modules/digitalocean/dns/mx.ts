import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

export default function records(domain: digitalocean.Domain) {

  const mx1 = new digitalocean.DnsRecord("o-p.n_mx-main", {
    domain: domain.id,
    name: "@",
    priority: 1,
    ttl: 1800,
    type: "MX",
    value: "aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx2 = new digitalocean.DnsRecord("o-p.n_mx-alt1", {
    domain: domain.id,
    name: "@",
    priority: 5,
    ttl: 1800,
    type: "MX",
    value: "alt1.aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx3 = new digitalocean.DnsRecord("o-p.n_mx-alt2", {
    domain: domain.id,
    name: "@",
    priority: 5,
    ttl: 1800,
    type: "MX",
    value: "alt2.aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx4 = new digitalocean.DnsRecord("o-p.n_mx-alt3", {
    domain: domain.id,
    name: "@",
    priority: 10,
    ttl: 1800,
    type: "MX",
    value: "alt3.aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx5 = new digitalocean.DnsRecord("o-p.n_mx-alt4", {
    domain: domain.id,
    name: "@",
    priority: 10,
    ttl: 1800,
    type: "MX",
    value: "alt4.aspmx.l.google.com.",
  }, {
    protect: true,
  });

  return pulumi.all([
    mx1, mx2, mx3, mx4, mx5,
  ]);
}
