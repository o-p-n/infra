import dropletStack from "./droplet";
import firewallStack from "./firewall";
import dnsStack from "./dns";

export default async function stack() {
  const droplet = dropletStack();
  const firewall = firewallStack(droplet);
  const dns = await dnsStack(droplet);

  return {
    dns,
    firewall,
    droplet,
  };
}
