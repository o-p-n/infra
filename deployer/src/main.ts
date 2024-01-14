/** */

import yargs from "yargs";
import { configureDecrypt } from "./cmd/decrypt.ts";
import { configureEncrypt } from "./cmd/encrypt.ts";

let argsCfg = yargs(Deno.args)
  .option("env", {
    desc: "the environment to operate on",
    demandOption: true,
    requiresArg: true,
    string: true,
  })
  .option("identity-dir", {
    desc: "the directory containing identities (public/private keys)",
    requiresArg: true,
    string: true,
  });
argsCfg = configureDecrypt(argsCfg);
argsCfg = configureEncrypt(argsCfg);

argsCfg.demandCommand().parse();
