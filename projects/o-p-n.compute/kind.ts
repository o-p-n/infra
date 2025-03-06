import { Config, output, ResourceOptions } from "@pulumi/pulumi";
import * as command from "@pulumi/command/local";
import * as k8s from "@pulumi/kubernetes";

import { KindCluster } from "../../modules/kind";
import { StackDeployer, StackOutputs } from "./types";
import { VERSION_FULL } from "../../modules/k8s/version";

interface KindRegistry {
  containerName: string;
  containerPort: number;

  hostName: string;
  hostPort: number;
}

const DEFAULTS_KIND_REGISTRY: Partial<KindRegistry> = {
  containerName: "registry",
  containerPort: 5000,
  hostName: "localhost",
}

export default async function deployKind(domain: string, resOpts: ResourceOptions): Promise<StackOutputs> {
  const config = new Config("kind");
  const registry = {
    ...DEFAULTS_KIND_REGISTRY,
    ...config.requireObject<KindRegistry>("registry"),
  };

  const version = output(VERSION_FULL);
  const configPath = `${process.env["HOME"]}/.kube/local.config`;
  const launchConfig = {
    kind: "Cluster",
    apiVersion: "kind.x-k8s.io/v1alpha4",
    containerdConfigPatches: [
`[plugins."io.containerd.grpc.v1.cri".registry]
  config_path = "/etc/containerd/certs.d"
`
    ],
    nodes: [
      {
        role: "control-plane",
      },
      {
        role: "worker",
      },
      {
        role: "worker",
      },
      {
        role: "worker",
      },
    ],
  }

  const cluster = new KindCluster(domain, {
    name: domain,
    configPath,
    launchConfig,
    version,
    registry,
  });
  const kubeconfig = cluster.kubeconfig;
  const cidrs = cluster.cidrs;

  return {
    version,
    kubeconfig,
    cidrs,
  };
}

