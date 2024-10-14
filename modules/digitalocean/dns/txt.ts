import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

export default function records(domain: digitalocean.Domain) {
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
  const txtAtProto = new digitalocean.DnsRecord("o-p.n_txt-atproto", {
    domain: domain.id,
    name: "_atproto.linuxwolf.outer-planes.net",
    ttl: 600,
    type: "TXT",
    value: "did=did:plc:q7quflbj34fos4eb7l4eqbsy",
  }, { protect: true });

  return pulumi.all([
    txtSpf, txtKeybase, txtGoogle, txtGitHubOPN, txtAtProto,
  ]);
}
