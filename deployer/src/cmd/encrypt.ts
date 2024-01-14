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

// ##### Command-line Setup #####
// deno-lint-ignore no-explicit-any
export function configureEncrypt(yargs: any) {
  return yargs
    .command(
      "encrypt <file>",
      "encrypt the given file for the environment",
      builder,
      handler,
    );
}

// deno-lint-ignore no-explicit-any
function builder(yargs: any) {
  return yargs
    .positional("file", {
      desc: "the file to encrypt",
      string: true,
    });
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
