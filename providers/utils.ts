import { randomBytes } from "crypto";
import { ID } from "@pulumi/pulumi";

export function makeID(): ID {
  return randomBytes(16).toString("hex");
}
