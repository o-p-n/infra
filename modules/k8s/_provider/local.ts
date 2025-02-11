import { local } from "@pulumi/command";
import { Kind } from "../../../providers/kind";
import { VERSION } from "./version";

export default async function stack() {
  const minikube = new Kind("local-minikube", {
    configPath: `${process.env["HOME"]}/.kube/local.config`,
    version: VERSION,
  });

  return {
    kubeconfig: minikube.kubeconfig,
  };
}
