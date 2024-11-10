import { $ } from "zx";
import { randomBytes } from "crypto";
import * as pulumi from "@pulumi/pulumi";

interface MiniKubeInputs {
  configPath: string;
  version?: string;
  addons?: string[];
  cpus?: number;
  memory?: string;
}
interface MiniKubeOutputs {
  kubeconfig: string;
};

const DEFAULTS: Partial<MiniKubeInputs> = {
  version: "stable",
  cpus: 2,
  memory: "8g",
};

const provider: pulumi.dynamic.ResourceProvider = {
  async create(inputs: MiniKubeInputs): Promise<pulumi.dynamic.CreateResult<MiniKubeOutputs>> {
    inputs = {
      ...DEFAULTS,
      ...inputs,
    };

    const id = randomBytes(16).toString("hex");
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
      outs: { kubeconfig },
    }
  },
  async delete(id: string, props: MiniKubeInputs) {
    const $$ = $({
      env: {
        ...process.env,
        KUBECONFIG: props.configPath,
      },
    });

    await $$`minikube delete`;
  },
};


interface MiniKubeArgs {
  configPath: pulumi.Input<string>;
  version?: pulumi.Input<string>;
  addons?: pulumi.Input<string[]>;
}

export class MiniKube extends pulumi.dynamic.Resource {
  readonly kubeconfig!: pulumi.Output<string>;

  constructor(name: string, args: MiniKubeArgs, opts?: pulumi.CustomResourceOptions) {
    super(provider, name, { kubeconfig: undefined, ...args }, opts);
  }
}
