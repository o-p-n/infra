import * as pulumi from "@pulumi/pulumi";
import { local } from "@pulumi/command";

export default async function stack() {
  const runnit = new local.Command("local-kubeconfig", {
    create: "cat ~/.kube/local.config",
  });

  return {
    kubeconfig: runnit.stdout,
  };
}
