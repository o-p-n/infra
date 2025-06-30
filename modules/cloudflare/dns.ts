import * as cf from "@pulumi/cloudflare";
import { Config, CustomResourceOptions } from "@pulumi/pulumi";

import { Settings } from "./types";

const DEFAULT_OPTS: CustomResourceOptions = {
  protect: true,
};

const config = new Config("o-p-n");

export default function stack(domain: string) {
  const settings = config.requireObject<Settings>("cloudflare");
  const { zone: zoneId } = settings;

  const mx = mxRecords(zoneId, domain);
  const txt = txtRecords(zoneId, domain);

  return {
    zoneId,
    mx,
    txt,
  };
}

function mxRecords(zoneId: string, domain: string): cf.DnsRecord[] {
  const args = {
    zoneId,
    ttl: 1800,
    type: "MX",
    name: domain,
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
    const priority = (idx <= 2) ? 5 : 10;
    const rec = new cf.DnsRecord(`mx-alt${idx}` , {
      ...args,
      priority,
      content: `alt${idx}.aspmx.l.google.com`,
    }, DEFAULT_OPTS);
    result.push(rec);
  }

  return result;
}

function txtRecords(zoneId: string, domain: string): cf.DnsRecord[] {
  const args = {
    zoneId,
    ttl: 86400,
    type: "TXT",
  };

  const txtSpf = new cf.DnsRecord("txt-spf", {
    ...args,
    name: domain,
    content: '"v=spf1 include:_spf.google.com ~all"',
  }, DEFAULT_OPTS);

  const txtGoogle = new cf.DnsRecord("txt-google", {
    ...args,
    name: domain,
    content: '"google-site-verification=x16tjnYyfxwSP957-vpBpf_7J-iPbKMBQQSnW1k4jxg"',
  }, DEFAULT_OPTS);

  const txtKeybase = new cf.DnsRecord("txt-keybase", {
    ...args,
    name: `_keybase.${domain}`,
    content: '"keybase-site-verification=B63zuCQwOofMV2JohWWXCas-pNlqQZmiwsbzbNaU0Bo"',
  }, DEFAULT_OPTS);

  const txtGithubOPN = new cf.DnsRecord("txt-github.o-p-n", {
    ...args,
    name: `_github-challenge-o-p-n-org.${domain}`,
    content: '"a6c52b455f"',
  }, DEFAULT_OPTS);

  const txtAtProtoLinuxwolf = new cf.DnsRecord("txt-atproto.linuxwolf", {
    ...args,
    name: `_atproto.linuxwolf.${domain}`,
    content: '"did=did:plc:q7quflbj34fos4eb7l4eqbsy"',
  }, DEFAULT_OPTS);

  return [
    txtSpf,
    txtGoogle,
    txtKeybase,
    txtGithubOPN,
    txtAtProtoLinuxwolf,
  ];
}
