import * as digitalocean from "@pulumi/digitalocean";

import nsStack from "./ns";
import caaStack from "./caa";
import mxStack from "./mx";
import txtStack from "./txt";
import addrStack from "./addr";

export default async function stack(droplet: digitalocean.Droplet) {
  const domain = new digitalocean.Domain("o-p.n", {name: "outer-planes.net"}, {
    protect: true,
  });
  
  const ns = nsStack(domain);
  const caa = caaStack(domain);
  const mx = mxStack(domain);
  const txt = txtStack(domain);
  const addresses = addrStack(domain, droplet);

  return {
    ns,
    caa,
    mx,
    txt,
    addresses,
  };
}
