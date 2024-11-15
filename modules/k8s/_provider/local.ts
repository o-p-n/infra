import { local } from "@pulumi/command";
import { MiniKube } from "../../../providers/minikube";
import { VERSION } from "./version";

export default async function stack() {
  const minikube = new MiniKube("local-minikube", {
    configPath: `${process.env["HOME"]}/.kube/local.config`,
    version: VERSION,
    addons: ["metrics-server"],
  })

  return {
    kubeconfig: minikube.kubeconfig,
  };
}
