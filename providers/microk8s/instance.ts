import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import * as YAML from "yaml";

import { Config, CustomResourceOptions, ID, Output, all } from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";

import { Conn, ConnOptions, create as createSession } from "./conn";
import { makeId } from "../utils";

export type LaunchConfigType = Record<string, unknown>;

export interface JoinInfo {
  token: string;
  urls: string[];
}

interface Inputs {
  hostname: string;

  version?: string;
  launchConfig?: LaunchConfigType;

  primary?: boolean;
  worker?: boolean;
  join?: JoinInfo;
}
interface Outputs {
  kubeconfig: string;
  join?: JoinInfo;
}

const INPUTS_DEFAULT: Partial<Inputs> = {
  version: "latest/stable",
};

const REMOTE_OPTS_DEFAULTS: Partial<ConnOptions> = {
  port: 22,
};

class Provider implements dynamic.ResourceProvider {
  private remoteOpts!: ConnOptions;
  private bastionOpts?: ConnOptions;

  private async session(host: string): Promise<Conn> {
    let bastion: Conn | undefined = undefined;
    if (this.bastionOpts) {
      bastion = await createSession({
        ...this.remoteOpts,
        ...this.bastionOpts,
      });
    }
    const session = await createSession({
      ...this.remoteOpts,
      host,
    }, bastion);

    return session;
  }

  async configure(req: dynamic.ConfigureRequest) {
    const remoteOpts = req.config.get("microk8s:remote");
    this.remoteOpts = {
      ...REMOTE_OPTS_DEFAULTS,
      ...JSON.parse(remoteOpts || "{}"),
    };
    console.error(`remote options: ${JSON.stringify(this.remoteOpts, null, "  ")}`);

    const bastionOpts = req.config.get("microk8s:bastion");
    if (bastionOpts) {
      const bastion = {
        ...this.remoteOpts,
        ...JSON.parse(bastionOpts || "{}"),
      }
      this.bastionOpts = bastion;
      console.error(`bastion options: ${JSON.stringify(this.bastionOpts, null, "  ")}`);
    }
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
    console.error("start create ...");
    inputs = {
      ...INPUTS_DEFAULT,
      ...inputs,
    };

    const id = await makeId({
      hostname: inputs.hostname,
    });

    const session = await this.session(inputs.hostname);

    if (inputs.launchConfig) {
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

    await session.execute(`sudo snap install microk8s --classic --channel=${inputs.version!}`);
    await session.execute("microk8s start");

    const kubeconfig = await session.execute("microk8s config");

    const outs: Outputs = {
      ...inputs,
      kubeconfig,
    };

    if (inputs.primary) {
      const token = await makeId({
      });
      const result = await session.execute(`microk8s add-node --token-ttl=600 --token=${token} --format=json`);
      outs.join = JSON.parse(result);
    }
    if (inputs.join) {
      // TODO: deal with expired tokens
      const { urls } = inputs.join;

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
    const session = await this.session(props.hostname);

    await session.execute("sudo snap remove microk8s --purge");
  }

  // diff?: ((id: ID, olds: any, news: any) => Promise<dynamic.DiffResult>) | undefined;
  // read?: ((id: ID, props?: any) => Promise<dynamic.ReadResult<any>>) | undefined;
  // update?: ((id: ID, olds: any, news: any) => Promise<dynamic.UpdateResult<any>>) | undefined;
}

export interface Microk8sArgs {
  hostname: string;
  version?: string;
  launchConfig?: LaunchConfigType;

  primary?: boolean;
  worker?: boolean;
  join?: JoinInfo;
};

export class Microk8sInstance extends dynamic.Resource {
  readonly kubeconfig!: Output<string>;

  constructor(name: string, args: Microk8sArgs, opts?: CustomResourceOptions) {
    super(
      new Provider(),
      name,
      {
        kubeconfig: undefined,
        ...args,
      },
      {
        ...opts,
        additionalSecretOutputs: ["join", "kubeconfig"],
      },
    );
  }
}
