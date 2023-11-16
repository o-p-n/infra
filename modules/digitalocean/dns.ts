import * as digitalocean from "@pulumi/digitalocean";

const domain = new digitalocean.Domain("default", {name: "outer-planes.net"}, {
  protect: true,
});

async function ns() {
  const ns1 = new digitalocean.DnsRecord("ns1", {
    domain: domain.id,
    name: "@",
    ttl: 1800,
    type: "NS",
    value: "ns1.digitalocean.com.",
  }, {
    protect: true,
  });
  const ns2 = new digitalocean.DnsRecord("ns2", {
    domain: domain.id,
    name: "@",
    ttl: 1800,
    type: "NS",
    value: "ns2.digitalocean.com.",
  }, {
    protect: true,
  });
  const ns3 = new digitalocean.DnsRecord("ns3", {
    domain: domain.id,
    name: "@",
    ttl: 1800,
    type: "NS",
    value: "ns3.digitalocean.com.",
  }, {
    protect: true,
  });
}

async function mx() {
  const mx1 = new digitalocean.DnsRecord("mx1", {
    domain: domain.id,
    name: "@",
    priority: 1,
    ttl: 1800,
    type: "MX",
    value: "aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx2 = new digitalocean.DnsRecord("mx2", {
    domain: domain.id,
    name: "@",
    priority: 5,
    ttl: 1800,
    type: "MX",
    value: "alt1.aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx3 = new digitalocean.DnsRecord("mx3", {
    domain: domain.id,
    name: "@",
    priority: 5,
    ttl: 1800,
    type: "MX",
    value: "alt2.aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx4 = new digitalocean.DnsRecord("mx4", {
    domain: domain.id,
    name: "@",
    priority: 10,
    ttl: 1800,
    type: "MX",
    value: "alt3.aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx5 = new digitalocean.DnsRecord("mx5", {
    domain: domain.id,
    name: "@",
    priority: 10,
    ttl: 1800,
    type: "MX",
    value: "alt4.aspmx.l.google.com.",
  }, {
    protect: true,
  }); 
}

async function txt() {
  const txtSpf = new digitalocean.DnsRecord("txtSpf", {
    domain: domain.id,
    name: "@",
    ttl: 86400,
    type: "TXT",
    value: "v=spf1 include:_spf.google.com ~all",
  }, {
    protect: true,
  });
  const txtKeybase = new digitalocean.DnsRecord("txtKeybase", {
    domain: domain.id,
    name: "_keybase",
    ttl: 3600,
    type: "TXT",
    value: "keybase-site-verification=B63zuCQwOofMV2JohWWXCas-pNlqQZmiwsbzbNaU0Bo",
  }, {
    protect: true,
  });
  const txtGoogle = new digitalocean.DnsRecord("txtGoogle", {
    domain: domain.id,
    name: "@",
    ttl: 86400,
    type: "TXT",
    value: "google-site-verification=x16tjnYyfxwSP957-vpBpf_7J-iPbKMBQQSnW1k4jxg",
  }, {
    protect: true,
  });
}

async function a_aaaa(droplet: digitalocean.Droplet) {
  const dropletA = new digitalocean.DnsRecord("o-p.n_A", {
    domain: domain.id,
    name: "@",
    ttl: 30,
    type: "A",
    value: droplet.ipv4Address,
  }, { dependsOn: [domain, droplet] });
  const dropletWildA = new digitalocean.DnsRecord("o-p.n_Awild", {
    domain: domain.id,
    name: "*",
    ttl: 30,
    type: "A",
    value: droplet.ipv4Address,
  }, { dependsOn: [domain, droplet] });
  const dropletAAAA = new digitalocean.DnsRecord("o-p.n_AAAA", {
    domain: domain.id,
    name: "@",
    ttl: 30,
    type: "AAAA",
    value: droplet.ipv6Address,
  }, { dependsOn: [domain, droplet] });
  const dropletWildAAAA = new digitalocean.DnsRecord("o-p.n_AAAAwild", {
    domain: domain.id,
    name: "*",
    ttl: 30,
    type: "AAAA",
    value: droplet.ipv6Address,
  }, { dependsOn: [domain, droplet] }); 
}

export async function stack(droplet: digitalocean.Droplet) {
  await Promise.all([
    ns(),
    mx(),
    txt(),
    a_aaaa(droplet),
  ]);
}
