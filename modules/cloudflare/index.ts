import * as cf from "@pulumi/cloudflare";
import * as k8s from "@pulumi/kubernetes";
import { Config } from "@pulumi/pulumi";

import { Settings } from "./types";
import { ModuleResultSet } from "../k8s/_basics";

import dnsStack from "./dns";
import tunnelStack from "./tunnel";
import k8sStack from "./k8s";

const config = new Config("o-p-n");

export default async function stack(provider: k8s.Provider, deployed: ModuleResultSet) {
  const settings = config.requireObject<Settings>("cloudflare");
  const { account: accountId, zone: zoneId } = settings;

  const tunnel = tunnelStack(accountId, zoneId);
  const k8s = k8sStack(tunnel.token, provider, deployed);

  return k8s;
}

export { Settings };
