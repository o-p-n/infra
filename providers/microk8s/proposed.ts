import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

import * as _ from "underscore";
import * as YAML from "yaml";
import { all, ComponentResource, ComponentResourceOptions, CustomResourceOptions, ID, Input, Output, secret } from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";
import { NodeSSH, SSHExecCommandOptions, SSHError } from "node-ssh";

import { makeId } from "../utils";
import * as sleep from "sleep-promise";

const ATTEMPTS_DEFAULTS = {
  max: 5,
  backoff: 1000,
};

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

export interface Microk8sOutputs extends Microk8sInputs {
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

  async function attemptConn(p: Promise<NodeSSH>) {
    let done = false;
    for (let attempt = 0; !done && attempt < ATTEMPTS_DEFAULTS.max; attempt++) {
      try {
        await p;
        done = true;
      } catch (error) {
        const err = error as Error;
        const duration = ATTEMPTS_DEFAULTS.backoff * Math.pow(2, attempt);
        console.error(`SSH attempt #${attempt + 1}/${ATTEMPTS_DEFAULTS.max} failed, retry in ${duration}ms (${err.message})`);
        await sleep(duration);
      }  
    }

    if (!done) {
      throw new Error("failed all SSH connection attempts");
    }
  }

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
    await attemptConn(target.connect(conn));
  }

  return target;
}

async function establishSession(inputs: Microk8sInputs): Promise<NodeSSH> {
  let bastion: undefined | NodeSSH = undefined;
  if (inputs.bastion) {
    bastion = await makeConnection(inputs.bastion);
  }
  const session = await makeConnection(inputs.remote, bastion);

  return session;
}

function connectionString(conn: Microk8sConnection): string {
  return `${conn.host}:${conn.port}`;
}

const provider: dynamic.ResourceProvider = {
  // check?: ((olds: any, news: any) => Promise<dynamic.CheckResult<any>>) | undefined;
  // diff?: ((id: ID, olds: any, news: any) => Promise<dynamic.DiffResult>) | undefined;
  // read?: ((id: ID, props?: any) => Promise<dynamic.ReadResult<any>>) | undefined;
  // update?: ((id: ID, olds: any, news: any) => Promise<dynamic.UpdateResult<any>>) | undefined;

  async diff(id: ID, olds: Microk8sOutputs, news: Microk8sInputs): Promise<dynamic.DiffResult> {
    news = {
      ...DEFAULT_INPUTS,
      ...news,
    };
    const replaces: string[] = [];
    let changes = false;

    if (olds.version !== news.version) {
      changes = true;
    }

    if (!_.isEqual(olds.launchConfig, news.launchConfig)) {
      replaces.push("launchConfig");
    }

    if (olds.primary !== news.primary) {
      replaces.push("primary");
    }
    if (olds.worker !== news.worker) {
      replaces.push("worker");
    }
    if (!_.isEqual(olds.join, news.join)) {
      changes = true;
    }

    changes = changes || replaces.length > 0

    return {
      changes,
      replaces,
      deleteBeforeReplace: true,
    };
  },

  async create(inputs: Microk8sInputs): Promise<dynamic.CreateResult<Microk8sOutputs>> {
    inputs = {
      ...DEFAULT_INPUTS,
      ...inputs,
    };

    const id = await makeId({
      remote: connectionString(inputs.remote),
    });

    const session = await establishSession(inputs);

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
      const token = await makeId({
        random: randomBytes(16).toString("hex"),
      });
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

  async update(id: ID, olds: Microk8sOutputs, news: Microk8sInputs): Promise<dynamic.UpdateResult<Microk8sOutputs>> {
    const session = await establishSession(news);

    if (olds.version !== news.version) {
      await session.execCommand(
        `sudo snap refresh microk8s --channel=${news.version!}`,
        { ...DEFAULT_EXECCOMMAND_OPTS},
      );
    }

    if (!_.isEqual(olds.join, news.join) && news.join) {
      // TODO: deal with expired join token
      const { urls } = news.join;

      await session.execCommand(
        `microk8s join ${news.worker ? "--worker" : ""} ${urls[0]}`,
        { ...DEFAULT_EXECCOMMAND_OPTS },
      );
    }

    const result = await session.execCommand("microk8s config", { ...DEFAULT_EXECCOMMAND_OPTS });
    const kubeconfig = result.stdout;

    const outs = {
      ...news,
      kubeconfig,
    };

    return {
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

export interface Microk8sClusterInputs {
  hosts: string[];
  remote: Partial<Microk8sConnection> & { port: number };
  bastion?: Microk8sConnection;

  version?: string;
  launchConfig?: LaunchConfigType;
}

export class Microk8sCluster extends ComponentResource {
  readonly kubeconfig: Output<string>;

  constructor(domain: string, args: Microk8sClusterInputs, opts?: ComponentResourceOptions) {
    super("o-p-n:microk8s:Cluster", domain, {}, opts);

    const { hosts, bastion, version, launchConfig } = args;
    if (launchConfig) {
      const extraSANs = (launchConfig.extraSANs || []) as string[];
      launchConfig.extraSANs = [
        ...extraSANs,
        domain,
      ];
    }

    let primary: Microk8s | undefined;
    const resources: Microk8s[] = [];
    for (const host of hosts) {
      const remote = {
        ...args.remote,
        host,
      };

      const resource = new Microk8s(
        host,
        {
          remote,
          bastion,
          version,
          launchConfig,
          join: primary?.join,
          primary: primary === undefined,
        },
        { parent: this },
      );
      primary = primary ?? resource;
      resources.push(resource);
    }
    all

    let kubeconfig = all(resources.map((r) => r.kubeconfig)).apply((cfgs) => {
      const primary = cfgs[0];
      const config = YAML.parse(primary);

      // fix-up server URL
      const loc = new URL(config.clusters[0].cluster.server);
      loc.hostname = domain;
      config.clusters[0].cluster.server = loc.toString();

      return YAML.stringify(config);
    });
    kubeconfig = secret(kubeconfig);
    this.kubeconfig = kubeconfig;

    this.registerOutputs({ kubeconfig });
  }
}
