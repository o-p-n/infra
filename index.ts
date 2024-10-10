import * as pulumi from "@pulumi/pulumi";
import * as k8s from "./k8s";

export = async () => {
  return {
    k8s,
  };
}
