import { ID } from "@pulumi/pulumi";
import { randomBytes, subtle } from "node:crypto";

export async function makeId(props: Record<string, string>): Promise<string> {
  const data = Buffer.from(JSON.stringify(props));
  const digest = await subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("hex").substring(0, 32);
}

export function makeID(): ID {
  return randomBytes(16).toString("hex");
}
