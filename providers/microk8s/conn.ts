import { dirname } from "node:path";

import { NodeSSH, SSHExecCommandOptions, SSHError, SSHExecCommandResponse } from "node-ssh";
import * as _ from "underscore";
import * as sleep from "sleep-promise";

import * as log from "@pulumi/pulumi/log";

export {
  NodeSSH,
};

export interface ConnOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

const ATTEMPTS_DEFAULTS = {
  max: 5,
  backoff: 1000,
};

const EXECCOMMAND_OPTS_DEFAULT: Partial<SSHExecCommandOptions> = {
  onStderr: (data) => {
    process.stderr.write(data);
  },
};

function pickPort(): number {
  return Math.floor(Math.random() * 65535) + 1;
}

export class Conn {
  private session: NodeSSH;

  constructor(session: NodeSSH) {
    this.session = session;
  }

  async execute(command: string, opts?: SSHExecCommandOptions): Promise<string> {
    const rsp = await this.session.execCommand(command, {
      ...EXECCOMMAND_OPTS_DEFAULT,
      ...opts,
    });

    return rsp.stdout;
  }

  async putFile(srcPath: string, dstPath: string, mkdir = true) {
    if (mkdir) {
      this.session.mkdir(dirname(dstPath));
    }

    await this.session.putFile(srcPath, dstPath);
  }

  async forward(conn: ConnOptions): Promise<Conn> {
    const target = new NodeSSH();

    this.session.connection!.on("close", () => {
      target.dispose();
    });

    const sock = await this.session.forwardOut("127.0.0.1", pickPort(), conn.host!, conn.port!);
    await target.connect(conn);

    return new Conn(target);
  }
}

export async function create(conn: ConnOptions, bastion?: Conn): Promise<Conn> {
  const target = new NodeSSH();

  if (bastion) {
    return bastion.forward(conn);
  }

  let done = false;
  for (let attempt = 0; !done && attempt < ATTEMPTS_DEFAULTS.max; attempt++) {
    try {
      await target.connect(conn);
      done = true;
    } catch (error) {
      const err = error as Error;
      const duration = ATTEMPTS_DEFAULTS.backoff * Math.pow(2, attempt);
      log.error(`SSH attempt #${attempt + 1}/${ATTEMPTS_DEFAULTS.max} failed, retry in ${duration}ms (${err.message})`);
      await sleep(duration);
    }  
  }

  if (!done) {
    throw new Error("failed all SSH connection attempts");
  }

  return new Conn(target);
}
