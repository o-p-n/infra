import { Config, Resource } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { ModuleResultSet } from "../_basics";

import { namespace as certManagerNamespace } from "../cert-manager";
import { setupIssuer as setupSelfCa } from "./self-ca";
import { setupIssuer as setupAcme } from "./acme";

const config = new Config();
const doConfig = new Config("digitalocean");

interface AcmeConfig {
  email: string;
  server: string;
}

interface IssuerSetupResult {
  resource: Resource,
  spec: Record<string, unknown>,
};
type IssuerSetup = (provider: k8s.Provider) => IssuerSetupResult;

export const issuerName = "cert-manager-issuer";

const ACME_CONFIG_DEFAULTS = {
  server: "https://acme-v02.api.letsencrypt.org/directory",
}

export default async function stack(provider: k8s.Provider, deployed: ModuleResultSet) {
  const enabled = {
    selfCa: config.getBoolean("self-ca-enabled"),
    acme: config.getBoolean("acme-enabled"),
  };
  const setupIssuer = ((enabled) => {
    if (enabled.acme) { return setupAcme }
    else if (enabled.selfCa) { return setupSelfCa }
    throw new Error("no issures specified");
  })(enabled);

  const { resource: secretRes, spec } = setupIssuer(provider);
  const manifest = {
    apiVersion: "cert-manager.io/v1",
    kind: "ClusterIssuer",
    metadata: {
      name: issuerName,
    },
    spec,
  };

  const issuerRes = new k8s.apiextensions.CustomResource(
    issuerName,
    manifest,
    {
      provider,
      dependsOn: [ secretRes, ...deployed.certManager.dependencies! ],
    },
  );

  return {
    resources: [
      issuerRes,
      secretRes,
    ],
  };
}
