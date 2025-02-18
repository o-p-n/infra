import { $ } from "zx";
import { randomBytes, subtle } from "node:crypto";
import * as os from "node:os";
import * as fs from "node:fs/promises";
import * as _ from "underscore";

import { CustomResourceOptions, ID, Input, log, Output } from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";

interface ProviderInputs {
  configPath: string;
  version?: string;
}

const DEFAULTS: Partial<ProviderInputs> = {
  version: "v1.31.4",
};

interface ProviderOutputs extends ProviderInputs {
  kubeconfig: string;
}

async function makeId(props: Record<string, string>): Promise<string> {
  const data = Buffer.from(JSON.stringify(props));
  const digest = await subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("hex").substring(0, 32);
}

async function findCluster(id: ID): Promise<boolean> {
  const output = await $`kind get clusters --quiet`;
  const stdout = output.stdout.trim();

  return stdout.split('\n').includes(id);
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
      changes = true;
    }

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
    let started = await findCluster(id);

    if (!started) {
      await $$`kind create cluster --name=${id} --image=docker.io/kindest/node:v${inputs.version} --wait=5m`;
    }

    const kubeconfig = await fs.readFile(inputs.configPath, { encoding: "utf-8"})

    return {
      id,
      outs: {
        ...inputs,

        kubeconfig,
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

    const kubeconfig = await fs.readFile(news.configPath, { encoding: "utf-8"})

    return {
      outs: {
        ...olds,
        ...news,
        kubeconfig,
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
  version?: Input<string>;
}

export class Kind extends dynamic.Resource {
  readonly configPath!: Output<string>;
  readonly version?: Output<string>;
  readonly kubeconfig!: Output<string>;

  constructor(name: string, args: KindArgs, opts?: CustomResourceOptions) {
    super(
      new Provider(),
      name,
      { kubeconfig: undefined, ...args },
      {
        ...opts,
        additionalSecretOutputs: ["kubeconfig"],
      });
  }
}
