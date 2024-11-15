import { $ } from "zx";
import { randomBytes, subtle } from "node:crypto";
import * as os from "node:os";
import * as _ from "underscore";

import { CustomResourceOptions, ID, Input, log, Output } from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";

interface ProviderInputs {
  configPath: string;
  version?: string;
  addons?: string[];
  cpus?: number;
  memory?: string;
}
interface ProviderOutputs extends ProviderInputs {
  kubeconfig: string;
};

const DEFAULTS: Partial<ProviderInputs> = {
  version: "stable",
  cpus: 2,
  memory: "8g",
};

async function makeId(props: Record<string, string>): Promise<string> {
  const data = Buffer.from(JSON.stringify(props));
  const digest = await subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("hex").substring(0, 32);
}

class Provider implements dynamic.ResourceProvider {
  async diff (id: ID, olds: ProviderOutputs, news: ProviderInputs): Promise<dynamic.DiffResult> {
    // apply defaults
    news = {
      ...DEFAULTS,
      ...news,
    }
    const replaces: string[] = [];
    let changes = false;

    // triggers replacement
    if (olds.memory !== news.memory) {
      replaces.push("memory");
      changes = true;
    }
    if (olds.cpus !== news.cpus) {
      replaces.push("cpus");
      changes = true;
    }
    if (olds.version !== news.version) {
      replaces.push("version");
      changes = true;
    }

    // needs update
    const oldAddons = olds.addons || [];
    const newAddons = news.addons || [];
    const disabling = _.difference(oldAddons, newAddons);
    const enabling = _.difference(newAddons, oldAddons);
    log.debug(`addons enabling=${enabling.join(",")}, disabling=${disabling.join(",")}`);
    changes = changes || enabling.length > 0 || disabling.length > 0;

    changes = changes || olds.configPath !== news.configPath;

    return {
      changes,
      replaces,
      deleteBeforeReplace: true,
    }
  }

  async create(inputs: ProviderInputs): Promise<dynamic.CreateResult<ProviderOutputs>> {
    inputs = {
      ...DEFAULTS,
      ...inputs,
    };

    const id = await makeId({
      hostname: os.hostname(),      
    });
    const $$ = $({
      env: {
        ...process.env,
        KUBECONFIG: inputs.configPath,
      },
    });

    let started: boolean;
    try {
      await $$`minikube status`;
      started = true;
    } catch (_err) {
      started = false;
    }

    if (!started) {
      await $$`minikube start --cpus=${inputs.cpus!} --memory=${inputs.memory!} --driver=docker --kubernetes-version=${inputs.version!} --insecure-registry=0.0.0.0/0`;
    }

    for (const addon of inputs.addons ?? []) {
      await $$`minikube addons enable ${addon}`;
    }

    const kubeconfig = (await $$`minikube kubectl -- config view --raw`).toString();

    return {
      id,
      outs: {
        ...inputs,

        kubeconfig,
      },
    }
  }

  async update(id: ID, olds: ProviderOutputs, news: ProviderInputs): Promise<dynamic.UpdateResult<ProviderOutputs>> {
    const $$ = $({
      env: {
        ...process.env,
        KUBECONFIG: news.configPath,
      },
    });

    // relocation configuration
    if (olds.configPath !== news.configPath) {
      await $$`cp ${olds.configPath} ${news.configPath}`;
    }

    // addons to disable
    const oldAddons = olds.addons || [];
    const newAddons = news.addons || [];
    const disabled = _.difference(oldAddons, newAddons);
    for (const addon of disabled) {
      await $$`minikube addons disable ${addon}`;
    }

    const enabled = _.difference(newAddons, oldAddons);
    for (const addon of enabled) {
      await $$`minikube addons enable ${addon}`;
    }
    const kubeconfig = (await $$`minikube kubectl -- config view --raw`).toString();

    return {
      outs: {
        ...olds,
        ...news,
        kubeconfig,
      },
    }
  }

  async delete(id: string, props: ProviderOutputs) {
    const $$ = $({
      env: {
        ...process.env,
        KUBECONFIG: props.configPath,
      },
    });

    await $$`minikube delete`;
  }
};


interface MiniKubeArgs {
  configPath: Input<string>;
  version?: Input<string>;
  addons?: Input<string[]>;
  cpus?: Input<number>;
  memory?: Input<string>;
}

export class MiniKube extends dynamic.Resource {
  readonly configPath!: Output<string>;
  readonly version?: Output<string>;
  readonly addons?: Output<string[]>;
  readonly cpus?: Output<number>;
  readonly memory?: Output<string>;
  readonly kubeconfig!: Output<string>;

  constructor(name: string, args: MiniKubeArgs, opts?: CustomResourceOptions) {
    super(new Provider(), name, { kubeconfig: undefined, ...args }, opts);
  }
}
