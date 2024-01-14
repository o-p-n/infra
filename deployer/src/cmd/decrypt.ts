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

// ##### Command-line Setup #####
// deno-lint-ignore no-explicit-any
export function configureDecrypt(yargs: any) {
  return yargs.command(
    "decrypt <file>",
    "decrypt the given file for the environment",
    builder,
    handler,
  );
}

// deno-lint-ignore no-explicit-any
function builder(yargs: any) {
  return yargs
    .positional("file", {
      desc: "the file to decrypt",
      string: true,
    });
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
