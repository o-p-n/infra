/** */

import { z } from "zod";

export const BaseSchema = z.object({
  identityDir: z.string()
    .optional()
    .default(Deno.env.get("DEPLOYER_IDENTITY_DIR") || Deno.cwd()),
});

export type BaseConfig = z.infer<typeof BaseSchema>;
