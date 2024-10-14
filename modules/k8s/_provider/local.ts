import { local } from "@pulumi/command";

export default async function stack() {
  const environment = {
    KUBECONFIG: `${process.env["HOME"]}/.kube/local.config`,
  };

  const minikube = new local.Command("local-minikube", {
    create: "minikube status || minikube start --cpus=2 --memory=8g --driver=docker --kubernetes-version=latest --insecure-registry=host.minikube.internal:5000",
    delete: "minikube delete",
    environment,
  });
  const runnit = new local.Command("local-kubeconfig", {
    create: "cat ${KUBECONFIG}",
    environment,
  }, { dependsOn: [minikube] });

  return {
    kubeconfig: runnit.stdout,
  };
}
