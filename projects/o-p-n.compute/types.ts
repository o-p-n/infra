import { Output, ResourceOptions } from "@pulumi/pulumi";

export interface StackOutputs {
  version: Output<string>;
  kubeconfig: Output<string>;
  cidrs?: Output<string[]>;
}

export type StackDeployer = (domain: string, resOpts: ResourceOptions, addresses?: Output<string[]>) => Promise<StackOutputs>;

