import * as digitalocean from "@pulumi/digitalocean";

const domain = new digitalocean.Domain("o-p.n", {name: "outer-planes.net"}, {
  protect: true,
});

function ns() {
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

function mx() {
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

  return [
    mx1, mx2, mx3, mx4, mx5,
  ];
}

function txt() {
  const txtSpf = new digitalocean.DnsRecord("o-p.n_txt-spf", {
    domain: domain.id,
    name: "@",
    ttl: 86400,
    type: "TXT",
    value: "v=spf1 include:_spf.google.com ~all",
  }, {
    protect: true,
  });
  const txtKeybase = new digitalocean.DnsRecord("o-p.n_txt-keybase", {
    domain: domain.id,
    name: "_keybase",
    ttl: 3600,
    type: "TXT",
    value: "keybase-site-verification=B63zuCQwOofMV2JohWWXCas-pNlqQZmiwsbzbNaU0Bo",
  }, {
    protect: true,
  });
  const txtGoogle = new digitalocean.DnsRecord("o-p.n_txt-google", {
    domain: domain.id,
    name: "@",
    ttl: 86400,
    type: "TXT",
    value: "google-site-verification=x16tjnYyfxwSP957-vpBpf_7J-iPbKMBQQSnW1k4jxg",
  }, {
    protect: true,
  });
  const txtGitHubOPN = new digitalocean.DnsRecord("o-p.n_txt-github.o-p-n", {
    domain: domain.id,
    name: "_github-challenge-o-p-n-org",
    ttl: 86400,
    type: "TXT",
    value: "a6c52b455f",
  }, {
    protect: true,
  });

  return [
    txtSpf, txtKeybase, txtGoogle, txtGitHubOPN,
  ];
}

function caa() {
  const caa = new digitalocean.DnsRecord("o-p.caa_letsencrypt", {
    domain: "outer-planes.net",
    name: "@",
    tag: "issue",
    ttl: 3600,
    type: "CAA",
    value: "letsencrypt.org.",
  }, {
      protect: true,
  });

  return [
    caa,
  ]
}

function aaaa(droplet: digitalocean.Droplet) {
  const dropletAAAA = new digitalocean.DnsRecord("o-p.n_aaaa-host", {
    domain: domain.id,
    name: "@",
    ttl: 30,
    type: "AAAA",
    value: droplet.ipv6Address,
  }, { dependsOn: [domain, droplet] });
  const dropletWildAAAA = new digitalocean.DnsRecord("o-p.n_aaaa-wild", {
    domain: domain.id,
    name: "*",
    ttl: 30,
    type: "AAAA",
    value: droplet.ipv6Address,
  }, { dependsOn: [domain, droplet] }); 

  return [ dropletAAAA, dropletWildAAAA ];
}

function a(droplet: digitalocean.Droplet) {
  const dropletA = new digitalocean.DnsRecord("o-p.n_a-host", {
    domain: domain.id,
    name: "@",
    ttl: 30,
    type: "A",
    value: droplet.ipv4Address,
  }, { dependsOn: [domain, droplet] });
  const dropletWildA = new digitalocean.DnsRecord("o-p.n_a-wild", {
    domain: domain.id,
    name: "*",
    ttl: 30,
    type: "A",
    value: droplet.ipv4Address,
  }, { dependsOn: [domain, droplet] });

  return [ dropletA, dropletWildA ];
}

export function stack(droplet?: digitalocean.Droplet) {
  let result: Record<string, unknown> = {
    domain,
    ns: ns(),
    caa: caa(),
    mx: mx(),
    txt: txt(),
  };
  if (droplet) {
    result = {
      ...result,
      a: a(droplet),
      aaaa: aaaa(droplet),
    };
  }
  return result;
}
