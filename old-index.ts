import * as pulumi from "@pulumi/pulumi";
import k8sStack from "./modules/k8s";

export = async () => {
  const k8s = await k8sStack();
  return {
    k8s,
  };
}
