import { ID } from "@pulumi/pulumi";
import { randomBytes, subtle } from "node:crypto";
import * as jsonpath from "jsonpath";

export async function makeId(props: Record<string, string>): Promise<string> {
  const data = Buffer.from(JSON.stringify(props));
  const digest = await subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("hex").substring(0, 32);
}

export function makeID(): ID {
  return randomBytes(16).toString("hex");
}

type JsonPrimitive = string | number | boolean | null;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export function obtainCIDRs(config: string): string[] {
  const json: any = JSON.parse(config);

  let items;
  items = jsonpath.query(json, "$..items").flat();
  items = items.filter(item => {
    const taints: Record<string, string>[] = (item.spec.taints ?? []);
    return taints.find(t => (
      t.effect === "NoSchedule" &&
      t.key === "node-role.kubernetes.io/control-plane"
    )) === undefined;
  });

  // TODO: account for IPv6 ...
  const result = jsonpath.query(
    items,
    "$..addresses[?(@.type=='InternalIP')].address",
  ).map(addr => `${addr}/32`);

  return result;
}
