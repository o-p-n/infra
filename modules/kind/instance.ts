import * as os from "node:os";
import * as fs from "node:fs/promises";

import { $, ProcessPromise } from "zx";
import * as _ from "underscore";
import * as YAML from "yaml";

import { CustomResourceOptions, ID, Input, log, Output } from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";

import { obtainCIDRs } from "../../internal/utils";
import { info } from "@pulumi/pulumi/log";

export type LaunchConfigType = Record<string, unknown>;

interface ProviderInputs {  
  configPath: string;
  name?: string;
  launchConfig?: LaunchConfigType;
  version?: string;
}

const DEFAULTS_INPUTS: Partial<ProviderInputs> = {
  version: "v1.31.4",
};

const DEFAULTS_LAUNCH_CONFIG: LaunchConfigType = {
  kind: "Cluster",
  apiVersion: "kind.x-k8s.io/v1alpha4",
};
interface ProviderOutputs extends ProviderInputs {
  kubeconfig: string;
  cidrs: string[];
}

class Provider implements dynamic.ResourceProvider {
  async diff (id: ID, olds: ProviderOutputs, news:ProviderInputs): Promise<dynamic.DiffResult> {
    news = {
      ...DEFAULTS_INPUTS,
      ...news,
    };
    const replaces: string[] = [];
    let changes = false;

    if (olds.version !== news.version) {
      replaces.push("version");
    }
    if (!_.isEqual(olds.launchConfig, news.launchConfig)) {
      replaces.push("launchConfig");
    }

    changes = changes || replaces.length > 0
    return {
      changes,
      replaces,
      deleteBeforeReplace: true,
    };
  }

  async create(inputs: ProviderInputs): Promise<dynamic.CreateResult<ProviderOutputs>> {
    inputs = {
      ...DEFAULTS_INPUTS,
      ...inputs,
    }

    const $$ = $({
      env: {
        ...process.env,
        KUBECONFIG: inputs.configPath,
      },
    });

    const id = inputs.name ?? os.hostname();
    const launchConfig = inputs.launchConfig ?? DEFAULTS_LAUNCH_CONFIG;

    const createProc = $$`kind create cluster --name=${id} --image=docker.io/kindest/node:v${inputs.version} --config=- --wait=5m`;
    createProc.stdin.write(YAML.stringify(launchConfig));
    createProc.stdin.end();
    await createProc;

    // obtain outputs
    const kubeconfig = await fs.readFile(inputs.configPath, { encoding: "utf-8"});
    const cidrs = obtainCIDRs((await $$`kubectl --kubeconfig=${inputs.configPath} get nodes --output json`).stdout);

    return {
      id,
      outs: {
        ...inputs,

        kubeconfig,
        cidrs,
      },
    };
  }

  async update(id: ID, olds: ProviderOutputs, news: ProviderInputs): Promise<dynamic.UpdateResult<ProviderOutputs>> {
    const $$ = $({
      env: {
        ...process.env,
        KUBECONFIG: news.configPath,
      },
    });

    if (olds.configPath !== news.configPath) {
      await $$`cp ${olds.configPath} ${news.configPath}`;
    }

    return {
      outs: {
        ...olds,
        ...news,
      },
    };
  }

  async delete(id: string, props: ProviderOutputs) {
    const $$ = $({
      env: {
        ...process.env,
        KUBECONFIG: props.configPath,
      },
    });

    await $$`kind delete cluster --name=${id}`;
  }
}

export interface KindArgs {
  name?: Input<string>;
  configPath: Input<string>;
  launchConfig?: Input<LaunchConfigType>;
  version?: Input<string>;
}

const provider = new Provider();

export class KindInstance extends dynamic.Resource {
  readonly name!: Output<string>;
  readonly configPath!: Output<string>;
  readonly launchConfig?: Output<LaunchConfigType>;
  readonly version?: Output<string>;
  readonly kubeconfig!: Output<string>;
  readonly cidrs!: Output<string[]>;

  constructor(name: string, args: KindArgs, opts?: CustomResourceOptions) {
    super(
      provider,
      name,
      {
        kubeconfig: undefined,
        cidrs: undefined,
        ...args,
      },
      {
        ...opts,
        additionalSecretOutputs: ["kubeconfig"],
      });
  }
}
