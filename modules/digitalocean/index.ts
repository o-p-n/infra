import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import { stack as droplet } from "./droplet";
import { stack as dns } from "./dns";
import { stack as firewall } from "./firewall";

export async function stack() {
  const inst = await droplet();

  await Promise.all([
    firewall(inst),
    dns(inst),
  ])
}
