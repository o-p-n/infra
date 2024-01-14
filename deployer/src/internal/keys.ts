/** */

import { BaseConfig } from "./config.ts";
import { join } from "deno_std/path/mod.ts";

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

export async function loadPrivateKey(cfg: KeyConfig): Promise<string> {
  return await loadKey(cfg, Mode.PRIVATE);
}

export async function loadPublicKey(cfg: KeyConfig): Promise<string> {
  return await loadKey(cfg, Mode.PUBLIC);
}
