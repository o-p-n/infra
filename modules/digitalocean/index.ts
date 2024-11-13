import * as digitalocean from "@pulumi/digitalocean";

import dropletStack from "./droplet";
import firewallStack from "./firewall";
import dnsStack from "./dns";


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

export default async function stack(mustExist = false) {
  if (!provisioned) {
    if (mustExist) {
      throw new Error("stack should exist but doesn't");
    }

    const droplet = dropletStack();
    const firewall = firewallStack(droplet);
    const dns = await dnsStack(droplet);
  
    provisioned = {
      dns,
      firewall,
      droplet,
    };
  }

  return provisioned;
}
