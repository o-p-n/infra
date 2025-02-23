import * as digitalocean from "@pulumi/digitalocean";

import nsStack from "./ns";
import caaStack from "./caa";
import mxStack from "./mx";
import txtStack from "./txt";
import cnameStack from "./cname";
import addrStack from "./addr";

let domain: digitalocean.Domain | undefined = undefined;

function getDomain(): digitalocean.Domain {
  if (!domain) {
    domain = new digitalocean.Domain("o-p.n", { name: "outer-planes.net" }, { protect: true });
  }
  return domain;
}

export default async function stack(droplet: digitalocean.Droplet) {
  const domain = getDomain();

  const { ns, caa, mx, txt, addresses } = await protectedStack();

  addresses.push(...addrStack(domain, droplet));

  return {
    ns,
    caa,
    mx,
    txt,
    addresses,
  };
}

export async function protectedStack() {
  const domain = getDomain();

  const ns = nsStack(domain);
  const caa = caaStack(domain);
  const mx = mxStack(domain);
  const txt = txtStack(domain);
  const addresses = cnameStack(domain);

  return {
    ns,
    caa,
    mx,
    txt,
    addresses,
  };
}
