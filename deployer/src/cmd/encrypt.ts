/** */

import { z } from "zod";
import $ from "dax";
import { resolve } from "deno_std/path/mod.ts";

import { BaseSchema } from "../internal/config.ts";
import { loadPublicKey } from "../internal/keys.ts";

export const EncryptSchema = BaseSchema.extend({
  env: z.string().min(1),
  file: z.string().min(1),
});

export const EncryptCommand = {
  command: "encrypt file",
  desc: "encrypt data for environment",
  builder: {
    env: {
      alias: "E",
      desc: "environment to encrypt for",
      demandOption: true,
      requiresArg: true,
      string: true,
    },
  },
  handler,
}

async function handler(args: unknown) {
  const cfg = EncryptSchema.parse(args);
  const {
    env,
    file,
  } = cfg;

  console.log(`encrypting ${file} for ${env}`);
  const srcPath = resolve("k8s", "env", env, file);
  const src = (await Deno.open(srcPath)).readable;

  const pubKey = await loadPublicKey(cfg);
  const result = await $`sops --encrypt /dev/stdin`
    .env({
      "SOPS_AGE_RECIPIENTS": pubKey,
    })
    .stdin(src)
    .stdout("piped");
  const dstPath = `${srcPath}.sops`;
  await Deno.writeTextFile(dstPath, result.stdout);
}
