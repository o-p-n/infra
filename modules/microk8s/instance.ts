import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import * as YAML from "yaml";

import { Config, CustomResourceOptions, ID, Input, Output, all } from "@pulumi/pulumi";
import * as log from "@pulumi/pulumi/log";
import * as dynamic from "@pulumi/pulumi/dynamic";

import { Conn, ConnOptions, create as createSession } from "./conn";
import { makeId, obtainCIDRs } from "../../internal/utils";

export type LaunchConfigType = Record<string, unknown>;

export interface JoinInfo {
  token: string;
  urls: string[];
}

interface Inputs {
  hostname: string;
  remote: ConnOptions;
  bastion?: ConnOptions;

  version?: string;
  launchConfig?: LaunchConfigType;

  primary?: ConnOptions & { host: string };
  worker?: boolean;
  join?: JoinInfo;
}
interface Outputs {
  kubeconfig: string;
  cidrs: string[];
  join?: JoinInfo;
}

const INPUTS_DEFAULT: Partial<Inputs> = {
  version: "latest/stable",
};

const REMOTE_OPTS_DEFAULTS: ConnOptions = {
  port: 22,
};

class Provider implements dynamic.ResourceProvider {
  private async session(inputs: Inputs): Promise<Conn> {
    const host = inputs.hostname;

    let bastion: Conn | undefined = undefined;
    if (inputs.bastion) {
      bastion = await createSession({
        ...inputs.remote,
        ...inputs.bastion,
      });
    }
    const session = await createSession({
      ...inputs.remote,
      host,
    }, bastion);

    return session;
  }

  async check(_olds: Inputs, news: Inputs): Promise<dynamic.CheckResult<Inputs>> {
    const failures: dynamic.CheckFailure[] = [];

    if (!news.hostname) {
      failures.push({
        property: "hostname",
        reason: "hostname cannot be empty",
      });
    }

    if (news.primary && news.join) {
      failures.push({
        property: "primary",
        reason: "cannot set both `primary` and `join`",
      });
    }

    return {
      inputs: news,
      failures,
    }
  }

  async create(inputs: Inputs): Promise<dynamic.CreateResult<Outputs>> {
    inputs = {
      ...INPUTS_DEFAULT,
      ...inputs,
    };

    const id = await makeId({
      hostname: inputs.hostname,
    });
    log.info(`create instance ${id} at ${inputs.hostname} @ v${inputs.version}`);

    const session = await this.session(inputs);

    if (inputs.launchConfig) {
      log.info(`initialize launch config for ${id}`);

      // temp storage for transfer
      const srcDir = resolve(tmpdir(), "pulumi", "microk8s-setup", id);
      await mkdir(srcDir, { recursive: true });

      const launchSrc = resolve(srcDir, "launch.yaml");
      await writeFile(launchSrc, YAML.stringify(inputs.launchConfig));

      const launchDst = `/tmp/pulumi/microk8s-setup/${id}/.microk8s.yaml`;
      await session.putFile(launchSrc, launchDst);

      await session.execute(`sudo mkdir -p /var/snap/microk8s/common`);
      await session.execute(`sudo cp ${launchDst} /var/snap/microk8s/common/`);
    }

    log.info(`install microk8s at ${id}`);
    await session.execute(`sudo snap install microk8s --classic --channel=${inputs.version!}`);

    log.info(`start microk8s at ${id}`);
    await session.execute("microk8s start");

    const kubeconfig = await session.execute("microk8s config");
    const cidrs = obtainCIDRs(await session.execute(`microk8s kubectl get nodes --output=json`));

    const outs: Outputs = {
      ...inputs,
      kubeconfig,
      cidrs,
    };

    let join = inputs.join;
    if (inputs.primary) {
      log.info(`create join for ${id} on primary ${JSON.stringify(inputs.primary)}`);
      const token = await makeId({
        random: randomBytes(8).toString("hex"),
      });

      const primary = await session.forward(inputs.primary);
      const result = await primary.execute(`microk8s add-node --token-ttl=600 --token=${token} --format=json`);
      join = JSON.parse(result) as JoinInfo;
    }
    if (join) {
      log.info(`join node ${id} to ${JSON.stringify(join)}...`);
      // TODO: deal with expired tokens
      const { urls } = join;

      // TODO: iterate through urls
      const worker = (inputs.worker) ? "--worker" : "";
      await session.execute(`microk8s join ${worker} ${urls[0]}`);
    }

    return {
      id,
      outs,
    };
  }

  async delete(id: ID, props: Inputs) {
    const session = await this.session(props);

    await session.execute("sudo snap remove microk8s --purge");
  }

  // diff?: ((id: ID, olds: any, news: any) => Promise<dynamic.DiffResult>) | undefined;
  // read?: ((id: ID, props?: any) => Promise<dynamic.ReadResult<any>>) | undefined;
  // update?: ((id: ID, olds: any, news: any) => Promise<dynamic.UpdateResult<any>>) | undefined;
}

export interface Microk8sArgs {
  hostname: Input<string>;
  remote?: Input<ConnOptions>;
  bastion?: Input<ConnOptions>;

  version?: Input<string>;
  launchConfig?: Input<LaunchConfigType>;

  primary?: Input<ConnOptions>;
  worker?: Input<boolean>;
  join?: Input<JoinInfo>;
};

export class Microk8sInstance extends dynamic.Resource {
  readonly kubeconfig!: Output<string>;
  readonly cidrs!: Output<string[]>;

  readonly hostname!: Output<string>;
  readonly remote!: Output<ConnOptions>;
  readonly bastion?: Output<ConnOptions>;

  readonly version?: Output<string>;
  readonly launchConfig?: Output<string>;

  readonly worker?: Output<boolean>;
  readonly join?: Output<JoinInfo>;

  constructor(name: string, args: Microk8sArgs, opts?: CustomResourceOptions) {
    super(
      new Provider(),
      `microk8s:${name}`,
      {
        kubeconfig: undefined,
        cidrs: undefined,
        ...args,
      },
      {
        ...opts,
        additionalSecretOutputs: ["bastion", "join", "kubeconfig", "remote"],
      },
    );
  }
}
