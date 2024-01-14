/** */

import { z } from "zod";

import { BaseSchema } from "../internal/config.ts";

export const ApplySchema = BaseSchema.extend({
  env: z.string().min(1),
  bootstrap: z.boolean().optional().default(false),
});

export type ApplyConfig = z.infer<typeof ApplySchema>;

export const ApplyCommand = {
  command: "apply",
  desc: "applies resources to given environment",
  builder: {
    bootstrap: {
      alias: "B",
      desc: "also apply bootstrapping",
      boolean: true,
    },
  },
  handler,
}

function handler(args: unknown) {
  const cfg = ApplySchema.parse(args);
  console.log(`do the apply for ${cfg.env} ...`);
  console.log(cfg);
}
