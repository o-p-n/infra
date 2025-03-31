import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { Provider } from "@pulumi/kubernetes/provider";

export interface ModuleArgs {
  reference: pulumi.StackReference;
  config: pulumi.Config;
  provider: k8s.Provider;
}

export interface ModuleResult {
  namespace?: k8s.core.v1.Namespace;
  releases?: k8s.helm.v3.Release[];
  resources?: pulumi.Resource[];
  dependencies?: pulumi.Resource[];
}

export interface ModuleOutput {
  namespace?: pulumi.Output<string>;
  releases?: pulumi.Output<string>[];
  resources?: pulumi.Output<string>[];
}

function outputStack(input: ModuleResult) {
  const result: ModuleOutput = {};

  if (input.namespace) {
    result.namespace = input.namespace.metadata.namespace;
  }

  const releases = input.releases?.map((rel) => {
    return pulumi.all([rel.repositoryOpts.repo, rel.name, rel.id]).apply(([repo, name]) => {
      return `${repo ?? ""}/${name}`;
    });
  });
  result.releases = releases;

  const resources = input.resources?.map((res) => res.urn);
  result.resources = resources;

  return result;
}

export type ModuleResultSet = Record<string, ModuleResult>;
export type ModuleProvisioner = (provider: k8s.Provider, deployed: ModuleResultSet, ref: pulumi.StackReference) => Promise<ModuleResult>;

export class K8sModuleRegistry {
  provider: k8s.Provider;
  ref: pulumi.StackReference;
  results: ModuleResultSet = {};

  constructor(ref: pulumi.StackReference, kubeconfig?: pulumi.Output<string>) {
    this.ref = ref;

    if (!kubeconfig) {
      console.log("### use stack output kubeconfig ...");
      kubeconfig = ref.getOutput("kubeconfig") as pulumi.Output<string>;
    } else {
      console.log("!!! use provided kubeconfig!");
    }
    this.provider = new Provider("k8s-provider", {
      kubeconfig,
      deleteUnreachable: true,
    });
  }

  async apply(name: string, fn: ModuleProvisioner) {
    const input = await fn(this.provider, this.results, this.ref);
    input.dependencies = [
      ...(input.dependencies ?? []),
      ...((input.namespace && [ input.namespace ]) ?? []),
      ...(input.releases ?? []),
      ...(input.resources ?? []),
    ];
    this.results[name] = input;
  }

  get deployed(): Record<string, ModuleOutput> {
    const entries = Object.entries(this.results);
    const outputs = entries.map(([name, result]) => [name, outputStack(result)]);

    return Object.fromEntries(outputs);
  }
}

