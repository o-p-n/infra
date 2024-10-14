import * as pulumi from "@pulumi/pulumi";
import { remote } from "@pulumi/command";
import doStack from "../../digitalocean";

const config = new pulumi.Config();

export default async function stack() {
  const digitalocean = await doStack();
  const privateKey = config.requireSecret("ssh-private-key");

  const runnit = new remote.Command("public-kubeconfig", {
    create: "microk8s config",
    connection: {
      host: "outer-planes.net",
      privateKey,
    },
  }, {
    dependsOn: [digitalocean.droplet ],
  });
}
