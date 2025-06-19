import * as cf from "@pulumi/cloudflare";
import * as k8s from "@pulumi/kubernetes";
import { Config, getStack, Output, Resource } from "@pulumi/pulumi";

import { ModuleResultSet } from "../k8s/_basics";

import dnsStack from "./dns";
import tunnelStack from "./tunnel";
import k8sStack from "./k8s";

export interface Settings {
  enabled: boolean,
  account: string,
}

const config = new Config("o-p-n");

export default async function stack(provider: k8s.Provider, deployed: ModuleResultSet) {
  const settings = config.requireObject<Settings>("cloudflare");
  const accountId = settings.account;

  const dns = dnsStack(accountId);
  const tunnel = tunnelStack(accountId, dns.zone);
  const k8s = k8sStack(tunnel.token, provider, deployed);

  return k8s;
}

