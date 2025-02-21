import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import * as os from "node:os";
import * as fs from "node:fs/promises";

import { $ } from "zx";
import * as _ from "underscore";
import * as YAML from "yaml";
import * as jsonpath from "jsonpath";

import { CustomResourceOptions, ID, Input, log, Output } from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";

import { makeId } from "../utils";

type LaunchConfigType = Record<string, unknown>;

interface ProviderInputs {
  configPath: string;
  launchConfig?: LaunchConfigType;
  version?: string;
}

const DEFAULTS: Partial<ProviderInputs> = {
  version: "v1.31.4",
};

interface ProviderOutputs extends ProviderInputs {
  kubeconfig: string;
  cidrs: string[];
}

class Provider implements dynamic.ResourceProvider {
  async diff (id: ID, olds: ProviderOutputs, news:ProviderInputs): Promise<dynamic.DiffResult> {
    news = {
      ...DEFAULTS,
      ...news,
    };
    const replaces: string[] = [];
    let changes = false;

    if (olds.version !== news.version) {
      replaces.push("version");
    }
    if (_.isEqual(olds.launchConfig, news.launchConfig)) {
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
      ...DEFAULTS,
      ...inputs,
    }

    const $$ = $({
      env: {
        ...process.env,
        KUBECONFIG: inputs.configPath,
      },
    });

    const id = await makeId({
      hostname: os.hostname(),
    });

    let launchConfig = "";
    if (inputs.launchConfig) {
      const dstDir = resolve(tmpdir(), "pulumi", "kind-setup", id);
      await mkdir(dstDir, { recursive: true });

      const launchDst = resolve(dstDir, "launch.yaml");
      await writeFile(launchDst, YAML.stringify(inputs.launchConfig));

      launchConfig = `--config=${launchDst}`;
    }

    await $$`kind create cluster --name=${id} --image=docker.io/kindest/node:v${inputs.version} ${launchConfig} --wait=5m`;

    // obtain outputs
    const kubeconfig = await fs.readFile(inputs.configPath, { encoding: "utf-8"});

    const nodesConfigStr = (await $$`kubectl --kubeconfig=${inputs.configPath} get nodes --output json`).stdout;
    const nodesConfig = JSON.parse(nodesConfigStr);
    const cidrs: string[] = jsonpath.query(
      nodesConfig,
      "$..status.addresses[?(@.type==\"InternalIP\")].address",
    ).map(addr => `${addr}/32`);

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

interface KindArgs {
  configPath: Input<string>;
  launchConfig?: Input<LaunchConfigType>;
  version?: Input<string>;
}

export class Kind extends dynamic.Resource {
  readonly configPath!: Output<string>;
  readonly launchConfig?: Output<LaunchConfigType>;
  readonly version?: Output<string>;
  readonly kubeconfig!: Output<string>;
  readonly cidrs!: Output<string[]>;

  constructor(name: string, args: KindArgs, opts?: CustomResourceOptions) {
    super(
      new Provider(),
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
