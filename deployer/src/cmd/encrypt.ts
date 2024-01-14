/** */

import { z } from "../deps.ts";

import { BaseSchema } from "../internal/config.ts";
import { Crypter } from "../internal/keys.ts";

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
  const crypter = new Crypter(cfg);

  await crypter.encrypt(cfg.file);
}
