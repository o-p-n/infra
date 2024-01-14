/** */

import { $, path } from "../deps.ts";
import { BaseConfig } from "./config.ts";

const {
  join,
  resolve,
} = path;

enum Mode {
  PUBLIC,
  PRIVATE,
};

export interface KeyConfig extends BaseConfig {
  env: string;
} 

async function loadKey(cfg: KeyConfig, mode: Mode): Promise<string> {
  const {
    env,
    identityDir
  } = cfg;

  const fname = env + ((mode === Mode.PUBLIC) ? ".pub" : "") + ".key";
  const path = join(identityDir, fname);
  const content = await Deno.readTextFile(path);
  return content;
}

export class Crypter {
  #publicKeys = new Map<string, string>();
  #privateKeys = new Map<string, string>();

  readonly config: KeyConfig;

  constructor(config: KeyConfig) {
    this.config = config;
  }

  async getPublicKey() {
    const { env } = this.config;
    console.debug(`getting public key for ${env}`);

    let key = this.#publicKeys.get(env);
    if (!key) {
      console.debug("no key found; loading ...");
      key = await loadKey(this.config, Mode.PUBLIC);
      this.#publicKeys.set(env, key);
    }

    return key;
  }

  async getPrivateKey() {
    const { env } = this.config;
    // console.debug(`getting private key for ${env}`);

    let key = this.#privateKeys.get(env);
    if (!key) {
      // console.debug("no key found; loading ...");
      key = await loadKey(this.config, Mode.PRIVATE);
      this.#privateKeys.set(env, key);
    }

    return key;
  }

  async encrypt(file: string) {
    const { env } = this.config;

    console.log(`encrypting ${file} for ${env}`);
    const srcPath = resolve("k8s", "env", env, file);
    const src = (await Deno.open(srcPath)).readable;
  
    const pubKey = await this.getPublicKey();
    const result = await $`sops --encrypt /dev/stdin`
      .env({
        "SOPS_AGE_RECIPIENTS": pubKey,
      })
      .stdin(src)
      .stdout("piped");

    const dstPath = `${srcPath}.sops`;
    await Deno.writeTextFile(dstPath, result.stdout);
    // console.debug(`encrypted ${srcPath} -> ${dstPath}`);
  }

  async decrypt(file: string) {
    const { env } = this.config;

    console.log(`decrypting ${file} for ${env}`);
    const dstPath = resolve("k8s", "env", env, file);

    const srcPath = `${dstPath}.sops`;
    const src = (await Deno.open(srcPath)).readable;

    const prvKey = await this.getPrivateKey();
    const result = await $`sops --decrypt /dev/stdin`
      .env({
        "SOPS_AGE_KEY": prvKey,
      })
      .stdin(src)
      .stdout("piped");

    await Deno.writeFile(dstPath, result.stdoutBytes);
    // console.debug(`decrypted ${srcPath} -> ${dstPath}`);
  }
}
