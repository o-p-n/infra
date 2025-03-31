import * as digitalocean from "@pulumi/digitalocean";

import doksStack from "./doks";
import firewallStack from "./firewall";
import dnsStack, { protectedStack as dnsProtectedStack } from "./dns";


interface DigitalOceanDnsStack {
  ns: digitalocean.DnsRecord[],
  caa: digitalocean.DnsRecord[],
  mx: digitalocean.DnsRecord[],
  txt: digitalocean.DnsRecord[],
  addresses: digitalocean.DnsRecord[],
}

interface DigitalOceanStack {
  dns: DigitalOceanDnsStack;
  droplet: digitalocean.Droplet;
  firewall: digitalocean.Firewall;
}


let provisioned: DigitalOceanStack | undefined;

export default async function stack() {
  const dns = await dnsProtectedStack();
  const doks = await doksStack();

  return {
    dns,
    doks,
  };
}
