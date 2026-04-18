import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import * as YAML from "yaml";
import * as _ from "underscore";

import { Config, CustomResourceOptions, ID, Input, Output } from "@pulumi/pulumi";
import * as log from "@pulumi/pulumi/log";
import * as dynamic from "@pulumi/pulumi/dynamic";

import { Conn, ConnOptions, create as createSession } from "./conn";
import { makeId, obtainCIDRs } from "../../internal/utils";

export type LaunchConfigType = Record<string, unknown>;

export interface ControlPlane {
  hostname?: string;
  proxy?: string;
}

export interface JoinInfo {
  token: string;
  urls: string[];
}

interface Inputs {
  hostname: string;
  remote: ConnOptions;
  bastion?: ConnOptions;
  controlPlane?: ControlPlane;

  version?: string;
  launchConfig?: LaunchConfigType;

  primary?: ConnOptions & { host: string };
  worker?: boolean;
}
interface Outputs extends Inputs {
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

    log.info(`establish session to ${host}`);

    let bastion: Conn | undefined = undefined;
    if (inputs.bastion) {
      const cfg: ConnOptions = {
        ...inputs.remote,
        ...inputs.bastion,
      };
      log.debug(`establish bastion connection ...`);
      bastion = await createSession(cfg);
    }

    const cfg: ConnOptions = {
      ...inputs.remote,
      host,
    };
    log.debug(`establish host connection ...`);
    const session = await createSession(cfg, bastion);

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
      log.debug(`initialize launch config for ${id}`);

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

    log.debug(`install microk8s at ${id}`);
    await session.execute(`sudo snap install microk8s --classic --channel=${inputs.version!}`);

    log.debug(`start microk8s at ${id}`);
    await session.execute("microk8s start");

    const kubeconfig = await session.execute("microk8s config");
    const cidrs = obtainCIDRs(await session.execute(`microk8s kubectl get nodes --output=json`));

    const outs: Outputs = {
      ...inputs,
      kubeconfig,
      cidrs,
    };

    if (inputs.primary) {
      log.debug(`create join for ${id} on primary ${JSON.stringify(inputs.primary)}`);
      const token = await makeId({
        random: randomBytes(8).toString("hex"),
      });

      const master = await session.forward(inputs.primary);
      const result = await master.execute(`microk8s add-node --token-ttl=600 --token=${token} --format=json`);
      const join = JSON.parse(result) as JoinInfo;

      log.info(`join node ${id} to ${JSON.stringify(join)}...`);
      const { urls } = join;

      // TODO: iterate through urls
      const worker = (inputs.worker) ? "--worker" : "";
      await session.execute(`microk8s join ${worker} ${urls[0]}`);
    }

    log.debug(`outputs: ${JSON.stringify(outs, null, "  ")}`);

    return {
      id,
      outs,
    };
  }

  async delete(id: ID, props: Inputs) {
    const session = await this.session(props);

    await session.execute("sudo snap remove microk8s --purge");
  }

  async diff(id: ID, olds: Outputs, news: Inputs): Promise<dynamic.DiffResult> {
    let changes = false;
    const replaces: string[] = [];

    news = {
      ...INPUTS_DEFAULT,
      ...news,
    };

    // in-place changes
    if (news.version !== olds.version) {
      changes = true;
    }

    // replacing changes
    if (news.hostname !== olds.hostname) {
      replaces.push("hostname");
    }
    if (!_.isEqual(news.launchConfig, olds.launchConfig)) {
      replaces.push("launchConfig");
    }
    if (!_.isEqual(news.primary, olds.primary)) {
      log.info(`olds primary: ${JSON.stringify(olds.primary ?? null, null, "  ")}`);
      log.info(`news primary: ${JSON.stringify(news.primary ?? null, null, "  ")}`);
      replaces.push("primary");
    }
    if (news.worker !== olds.worker) {
      replaces.push("worker");
    }

    // !!! everything else does not trigger an update !!!

    changes = changes || (replaces.length > 0);
    const deleteBeforeReplace = (replaces.length > 0) || undefined;
    return {
      changes,
      replaces,
      deleteBeforeReplace,
    };
  }

  async update(id: ID, olds: Outputs, news: Inputs): Promise<dynamic.UpdateResult<Outputs>> {
    const session = await this.session(news);

    // TODO: drain this node ...
    await session.execute(`sudo snap refresh microk8s --channel=${news.version}`);
    // TODO: uncordon this node ...

    const outs: Outputs = {
      ...olds,
      ...news,
    };
    return {
      outs,
    };
  }

  // read?: ((id: ID, props?: any) => Promise<dynamic.ReadResult<any>>) | undefined;
}

export interface Microk8sArgs {
  hostname: Input<string>;
  remote?: Input<ConnOptions>;
  bastion?: Input<ConnOptions>;
  controlPlane?: Input<ControlPlane>;

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
  readonly controlPlane?: Output<ControlPlane>;

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
