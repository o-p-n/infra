import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface ModuleResult {
  namespace?: k8s.core.v1.Namespace,
  releases: k8s.helm.v3.Release[],
  dependencies?: pulumi.Resource[];
}

export interface ModuleOutput {
  namespace?: pulumi.Output<string>;
  releases?: pulumi.Output<string>[];
}

function outputStack(input: ModuleResult) {
  const result: ModuleOutput = {};

  if (input.namespace) {
    result.namespace = input.namespace.metadata.namespace;
  }

  const releases = input.releases.map((rel) => {
    return pulumi.all([rel.repositoryOpts.repo, rel.name, rel.id]).apply(([repo, name]) => {
      return `${repo ?? ""}/${name}`;
    });
  });
  result.releases = releases;

  return result;
}

export type ModuleResultSet = Record<string, ModuleResult>;

export class K8sModuleRegistry {
  provider: k8s.Provider;
  results: ModuleResultSet = {};

  constructor(provider: k8s.Provider) {
    this.provider = provider;
  }

  async apply(name: string, fn: (provider: k8s.Provider, deployed?: ModuleResultSet) => Promise<ModuleResult>) {
    const input = await fn(this.provider, this.results);
    input.dependencies = [
      ...(input.dependencies ?? []),
      ...((input.namespace && [ input.namespace ]) ?? []),
      ...input.releases,
    ];
    this.results[name] = input;
  }

  get deployed(): Record<string, ModuleOutput> {
    const entries = Object.entries(this.results);
    const outputs = entries.map(([name, result]) => [name, outputStack(result)]);

    return Object.fromEntries(outputs);
  }
}

