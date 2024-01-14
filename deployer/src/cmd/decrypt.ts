/** */

import { z } from "../deps.ts";

import { BaseSchema } from "../internal/config.ts";
import { Crypter } from "../internal/keys.ts";

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
  const crypter = new Crypter(cfg);

  await crypter.decrypt(cfg.file);
}
