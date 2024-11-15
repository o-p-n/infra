import { local } from "@pulumi/command";
import { MiniKube } from "../../../providers/minikube";

export default async function stack() {
  const minikube = new MiniKube("local-minikube", {
    configPath: `${process.env["HOME"]}/.kube/local.config`,
    version: "1.31",
    addons: ["metrics-server"],
  })

  return {
    kubeconfig: minikube.kubeconfig,
  };
}
