import * as digitalocean from "@pulumi/digitalocean";
import * as droplet from "./droplet";
import * as dns from "./dns";
import * as fw from "./firewall";

export = async () => {
  const instance = droplet.stack();

  const firewall = fw.stack(instance);
  const dnsRecords = dns.stack(instance);

  return {
    droplet: instance,
    firewall,
    dns: dnsRecords,
  };
};
