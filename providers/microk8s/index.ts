import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import * as _ from "underscore";
import * as YAML from "yaml";
import { ComponentResource, ComponentResourceOptions, CustomResourceOptions, ID, Input, Output, secret } from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";
import { NodeSSH, SSHExecCommandOptions } from "node-ssh";

import { makeID } from "../utils";

export interface Microk8sConnection {
  port: number;
  host: string;
  username?: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

type LaunchConfigType = Record<string, unknown>;

interface Microk8sInputs {
  version?: string;
  launchConfig?: LaunchConfigType;

  primary?: boolean;
  worker?: boolean;
  join?: Microk8sJoinInfo;

  remote: Microk8sConnection;
  bastion?: Microk8sConnection;
}

export interface Microk8sOutputs {
  kubeconfig: string;
  join?: Microk8sJoinInfo;
}

export interface Microk8sJoinInfo {
  token: string;
  urls: string[];
}

const DEFAULT_INPUTS: Partial<Microk8sInputs> = {
  version: "1.31/stable",
};

const DEFAULT_EXECCOMMAND_OPTS: Partial<SSHExecCommandOptions> = {
  onStderr: (data) => {
    process.stderr.write(data);
  },
};

async function makeConnection(conn: Microk8sConnection, bastion?: NodeSSH): Promise<NodeSSH> {
  const target = new NodeSSH();

  if (bastion) {
    // chain cleanup
    bastion.connection?.on("close", () => {
      target.dispose();
    });

    // connect to bastion host
    const config: Omit<Microk8sConnection, "host" | "port"> = _.omit(conn, "host", "port");

    // chained connection
    const sock = await bastion.forwardOut("127.0.0.1", 12345, conn.host, conn.port);
    await target.connect({
      ...config,
      sock,
    });
  } else {
    // direct connection
    await target.connect(conn);
  }

  return target;
}

const provider: dynamic.ResourceProvider = {
  // check?: ((olds: any, news: any) => Promise<dynamic.CheckResult<any>>) | undefined;
  // diff?: ((id: ID, olds: any, news: any) => Promise<dynamic.DiffResult>) | undefined;
  // read?: ((id: ID, props?: any) => Promise<dynamic.ReadResult<any>>) | undefined;
  // update?: ((id: ID, olds: any, news: any) => Promise<dynamic.UpdateResult<any>>) | undefined;

  async create(inputs: Microk8sInputs): Promise<dynamic.CreateResult<Microk8sOutputs>> {
    inputs = {
      ...DEFAULT_INPUTS,
      ...inputs,
    };

    const id = makeID();

    let bastion: NodeSSH | undefined = undefined;
    if (inputs.bastion) {
      // establish bastion
      bastion = await makeConnection(inputs.bastion);
    }

    // establish session
    const session = await makeConnection(inputs.remote, bastion);

    if (inputs.launchConfig) {
      // temp storage for transfer
      const srcDir = resolve(tmpdir(), "pulumi", "microk8s-setup", id);
      await mkdir(srcDir, { recursive: true });

      const launchSrc = resolve(srcDir, "launch.yaml");
      await writeFile(launchSrc, YAML.stringify(inputs.launchConfig));

      const dstDir = `/tmp/pulumi/microk8s-setup/${id}`;
      await session.mkdir(dstDir);

      const launchDst = `${dstDir}/.microk8s.yaml`;
      await session.putFile(launchSrc, launchDst);

      await session.execCommand(`sudo mkdir -p /var/snap/microk8s/common`, { ...DEFAULT_EXECCOMMAND_OPTS });
      await session.execCommand(`sudo cp ${launchDst} /var/snap/microk8s/common/`, { ...DEFAULT_EXECCOMMAND_OPTS });
    }

    await session.execCommand(
      `sudo snap install microk8s --classic --channel=${inputs.version!}`,
      { ...DEFAULT_EXECCOMMAND_OPTS },
    );
    await session.execCommand(
      "microk8s start",
      { ...DEFAULT_EXECCOMMAND_OPTS },
    );

    const result = await session.execCommand(
      "microk8s config",
      { ...DEFAULT_EXECCOMMAND_OPTS },
    );
    const kubeconfig = result.stdout;

    const outs: Microk8sOutputs = {
      ...inputs,
      kubeconfig,
    };

    if (inputs.primary) {
      const token = makeID();
      const result = await session.execCommand(
        `microk8s add-node --token-ttl=600 --token=${token} --format json`,
        { ...DEFAULT_EXECCOMMAND_OPTS },
      );
      const join = JSON.parse(result.stdout);
      outs.join = join;
    } else if (inputs.join) {
      // TODO: deal with expired join token
      const { urls } = inputs.join;

      await session.execCommand(
        `microk8s join ${inputs.worker ? "--worker" : ""} ${urls[0]}`,
        { ...DEFAULT_EXECCOMMAND_OPTS },
      );
    }

    return {
      id,
      outs,
    };
  },
  async delete(id: ID, props: Microk8sInputs) {
    let bastion: NodeSSH | undefined = undefined;
    if (props.bastion) {
      // establish bastion
      bastion = await makeConnection(props.bastion);
    }

    // establish session
    const session = await makeConnection(props.remote, bastion);

    await session.execCommand("sudo snap remove microk8s --purge", {
      ...DEFAULT_EXECCOMMAND_OPTS,
    });
  }
}

export interface Microk8sArgs {
  version?: Input<string>;
  launchConfig?: Input<LaunchConfigType>;
  primary?: Input<boolean>;

  join?: Input<Microk8sJoinInfo>;
  worker?: Input<boolean>;

  remote: Input<Microk8sConnection>;
  bastion?: Input<Microk8sConnection>;
}

export class Microk8s extends dynamic.Resource {
  readonly kubeconfig!:  Output<string>;

  readonly version?: Output<string>;
  readonly launchConfig?: Output<string>;

  readonly master?: Output<boolean>;
  readonly worker?: Output<boolean>;
  readonly join?: Output<Microk8sJoinInfo>;

  readonly remote!: Output<Microk8sConnection>;
  readonly bastion?: Output<Microk8sConnection>;


  constructor(name: string, args: Microk8sArgs, opts?: CustomResourceOptions) {
    super(
      provider,
      name,
      { 
        kubeconfig: undefined,
        ...args,
      },
      {
        ...opts,
        additionalSecretOutputs: ["bastion", "join", "kubeconfig", "remote"],
      },
    );
  }
}
