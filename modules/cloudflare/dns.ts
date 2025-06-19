import * as cf from "@pulumi/cloudflare";
import { Config, CustomResourceOptions } from "@pulumi/pulumi";

const DEFAULT_OPTS: CustomResourceOptions = {
  protect: true,
};

const config = new Config("o-p-n");

export default function stack(accountId: string) {
  const zone = new cf.Zone("zone", {
    account: { id: accountId },
    name: config.require("domain"),
  }, DEFAULT_OPTS);

  const mx = mxRecords(zone);
  const txt = txtRecords(zone);

  return {
    zone,
    mx,
    txt,
  };
}

function mxRecords(zone: cf.Zone): cf.DnsRecord[] {
  const args = {
    zoneId: zone.id,
    ttl: 1800,
    type: "MX",
    name: "@",
  };

  const result: cf.DnsRecord[] = [];
  result.push(
    new cf.DnsRecord("mx-main", {
      ...args,
      priority: 1,
      content: "aspmx.l.google.com",
    }, DEFAULT_OPTS),
  );

  for (let idx = 1; idx <= 4; idx++) {
    const priority = (idx <= 3) ? 5 : 10;
    const rec = new cf.DnsRecord(`mx-alt${idx}` , {
      ...args,
      priority,
      content: `alt${idx}.aspmx.l.google.com`,
    }, DEFAULT_OPTS);
    result.push(rec);
  }

  return result;
}

function txtRecords(zone: cf.Zone): cf.DnsRecord[] {
  const args = {
    zoneId: zone.id,
    ttl: 86400,
    type: "TXT",
  };

  const txtSpf = new cf.DnsRecord("txt-spf", {
    ...args,
    name: "@",
    content: "v=spf1 include:_spf.google.com ~all",
  }, DEFAULT_OPTS);

  const txtGoogle = new cf.DnsRecord("txt-google", {
    ...args,
    name: "@",
    content: "google-site-verification=x16tjnYyfxwSP957-vpBpf_7J-iPbKMBQQSnW1k4jxg",    
  }, DEFAULT_OPTS);

  const txtKeybase = new cf.DnsRecord("txt-keybase", {
    ...args,
    name: "_keybase",
    content: "keybase-site-verification=B63zuCQwOofMV2JohWWXCas-pNlqQZmiwsbzbNaU0Bo",
  }, DEFAULT_OPTS);

  const txtGithubOPN = new cf.DnsRecord("txt-github.o-p-n", {
    ...args,
    name: "_github-challenge-o-p-n-org",
    content: "a6c52b455f",
  }, DEFAULT_OPTS);

  const txtAtProtoLinuxwolf = new cf.DnsRecord("txt-atproto.linuxwolf", {
    ...args,
    name: "_atproto.linuxwolf",
    content: "did=did:plc:q7quflbj34fos4eb7l4eqbsy",
  }, DEFAULT_OPTS);

  return [
    txtSpf,
    txtGoogle,
    txtKeybase,
    txtGithubOPN,
    txtAtProtoLinuxwolf,
  ];
}
