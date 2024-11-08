import * as pulumi from "@pulumi/pulumi";
import { remote } from "@pulumi/command";
import doStack from "../../digitalocean";

const config = new pulumi.Config();

export default async function stack() {
  const digitalocean = await doStack();
  const user = config.requireSecret("ssh-username");
  const privateKey = config.requireSecret("ssh-private-key");

  const kubeconfig = new remote.Command("public-kubeconfig", {
    create: "microk8s config",
    connection: {
      host: "outer-planes.net",
      user,
      privateKey,
    },
  }, {
    dependsOn: [digitalocean.droplet ],
  });

  return {
    kubeconfig: kubeconfig.stdout,
  };
}
