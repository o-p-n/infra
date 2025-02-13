import { local } from "@pulumi/command";
import { Kind } from "../../../providers/kind";
import { VERSION_FULL } from "./version";

export default async function stack() {
  const minikube = new Kind("local-minikube", {
    configPath: `${process.env["HOME"]}/.kube/local.config`,
    version: VERSION_FULL,
  });

  return {
    kubeconfig: minikube.kubeconfig,
  };
}
