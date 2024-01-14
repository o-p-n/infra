/** */

import { z } from "zod";

import { BaseSchema } from "../internal/config.ts";

export const ApplySchema = BaseSchema.extend({
  bootstrap: z.boolean().optional().default(false),
});

export type ApplyConfig = z.infer<typeof ApplySchema>;

// ##### Command-line Setup #####
// deno-lint-ignore no-explicit-any
export function configureApply(yargs: any) {
  return yargs
    .command(
      "apply",
      "applies resources for the given environment",
      builder,
      handler,
    );
}

// deno-lint-ignore no-explicit-any
function builder(yargs: any) {
  return yargs
    .option("bootstrap", {
      alias: "B",
      desc: "also apply bootstrapping",
      boolean: true,
    });
}

function handler(args: unknown) {
  const cfg = ApplySchema.parse(args);
  console.log(`do the apply for ${cfg.env} ...`);
  console.log(cfg);
}
