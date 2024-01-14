/** */

import { z } from "zod";
import $ from "dax";
import { resolve } from "deno_std/path/mod.ts";

import { BaseSchema } from "../internal/config.ts";
import { loadPrivateKey } from "../internal/keys.ts";

export const DecryptSchema = BaseSchema.extend({
  env: z.string().min(1),
  file: z.string().min(1),
});

export const DecryptCommand = {
  command: "decrypt file",
  desc: "decrypt data for environment",
  builder: {
    env: {
      alias: "E",
      desc: "environment to decrypt for",
      demandOption: true,
      requiresArg: true,
      string: true,
    },
  },
  handler,
}

async function handler(args: unknown) {
  const cfg = DecryptSchema.parse(args);
  const {
    env,
    file,
  } = cfg;

  console.log(`decrypting ${file} for ${env}`);
  const dstPath = resolve("k8s", "env", env, file);

  const srcPath = `${dstPath}.sops`;
  const src = (await Deno.open(srcPath)).readable;

  const prvKey = await loadPrivateKey(cfg);
  const result = await $`sops --decrypt /dev/stdin`
    .env({
      "SOPS_AGE_KEY": prvKey,
    })
    .stdin(src)
    .stdout("piped");
  await Deno.writeFile(dstPath, result.stdoutBytes);
}
