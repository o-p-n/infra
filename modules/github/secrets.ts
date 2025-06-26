import { CustomResourceOptions, ID, Input, log, Output } from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";
import * as sodium from "libsodium-wrappers";

import { createAppAuth } from "@octokit/auth-app";
import { App, Octokit } from "octokit";

interface AppAuth {
  appId: string;
  installationId: string;
  privateKey: string;
}

interface PublicKeyResult {
  key_id: string;
  key: string;
}

interface OrgSecretInputs {
  org: string;
  name: string;
  value: string;
}
type OrgSecretOutputs = OrgSecretInputs;

class ValueEncrypter {
  private key: Uint8Array;

  constructor(key: string) {
    log.info(`key == ${key}`);
    this.key = Buffer.from(key, "base64");
  }

  encrypt(value: string) {
    const data = sodium.from_string(value);
    const enc = sodium.crypto_box_seal(data, this.key);
    const result = sodium.to_base64(enc, sodium.base64_variants.ORIGINAL);

    return result;
  }
}

class Provider implements dynamic.ResourceProvider {
  private auth?: AppAuth;

  private octokit() {
    const result = new Octokit({
      authStrategy: createAppAuth,
      auth: this.auth,
    });
  
    return result;
  }

  private async getPublicKey(octokit: Octokit, org: string): Promise<PublicKeyResult> {
    log.info(`retrieve public key for ${org} ...`);
    const result = await octokit.request("GET /orgs/{org}/actions/secrets/public-key", {
      org,
    });

    return result.data;
  }

  async configure(req: dynamic.ConfigureRequest): Promise<void> {
    const auth = JSON.parse(req.config.require("github:app"));

    this.auth = auth;
  }

  async diff(id: ID, olds: OrgSecretOutputs, news: OrgSecretInputs): Promise<dynamic.DiffResult> {
    const replaces: string[] = [];
    let changes = false;

    if (olds.org !== news.org) {
      replaces.push("org");
    }
    if (olds.name !== news.name) {
      replaces.push("name");
    }
    if (olds.value !== news.value) {
      changes = true;
    }

    changes = changes || (replaces.length > 0);

    return {
      deleteBeforeReplace: false,
      changes,
      replaces,
    };
  }

  async create(inputs: OrgSecretInputs): Promise<dynamic.CreateResult<OrgSecretOutputs>> {
    const octokit = this.octokit();
    const org = inputs.org;
    const name = inputs.name;

    const id = `${org}:${name}`;

    // obtain org key
    const orgKey = await this.getPublicKey(octokit, org);

    // encrypt value
    await sodium.ready;
    const encrypter = new ValueEncrypter(orgKey.key);
    const value = encrypter.encrypt(inputs.value);

    // set secret
    log.info(`set secret ${inputs.name} on ${org}`);
    await octokit.request("PUT /orgs/{org}/actions/secrets/{secret_name}", {
      org,
      secret_name: inputs.name,
      key_id: orgKey.key_id,
      encrypted_value: value,
      visibility: "all",
    });

    const outs: OrgSecretOutputs = inputs;
    return {
      id,
      outs,
    }
  }

  async update(id: ID, olds: OrgSecretOutputs, news: OrgSecretInputs): Promise<dynamic.UpdateResult<OrgSecretOutputs>> {
    const result = await this.create(news);
    const outs = result.outs;

    return {
      outs,
    };
  }

  async delete(id: ID, props: OrgSecretInputs) {
    const org = props.org;
    const name = props.name;

    const octokit = this.octokit();
    await octokit.request("DELETE /orgs/{org}/actions/secrets/{secret_name}", {
      org,
      secret_name: name,
    });
  }
}

export interface OrgSecretArgs {
  org: Input<string>;
  name: Input<string>;
  value: Input<string>;
}

export class OrgSecret extends dynamic.Resource {
  readonly org!: Output<string>;
  readonly name!: Output<string>;
  readonly value!: Output<string>;

  constructor(name: string, args: OrgSecretArgs, opts?: CustomResourceOptions) {
    super(
      new Provider(),
      `github-org-secret:${name}`,
      args,
      {
        ...opts,
        additionalSecretOutputs: ["value"],
      },
    );
  }
}
