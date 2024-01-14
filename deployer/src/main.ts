/** */

import yargs from "yargs";
import { ApplyCommand } from "./cmd/apply.ts";
import { DecryptCommand } from "./cmd/decrypt.ts";
import { EncryptCommand } from "./cmd/encrypt.ts";

yargs(Deno.args)
  .option("identity-dir", {
    alias: "I",
    desc: "directory containing identities (public/private keys)",
    requiresArg: true,
    string: true,
  })
  .command(ApplyCommand)
  .command(DecryptCommand)
  .command(EncryptCommand)
  .demandCommand()
  .parse();
