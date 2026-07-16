import { Config, Resource } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { ModuleResultSet } from "../_basics";

import { namespace as certManagerNamespace } from "../cert-manager";
import { setupIssuer as setupSelfCa } from "./self-ca";
import { setupIssuer as setupAcme } from "./acme";

const config = new Config("certificates");

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

function determineIssuer(mode: string): IssuerSetup {
  switch (mode) {
    case "self-ca":
      return setupSelfCa;
    case "acme":
      return setupAcme;
    default:
      throw new Error(`unsupported issuer mode: ${mode}`);
  }
}

export default async function stack(provider: k8s.Provider, deployed: ModuleResultSet) {
  const mode = config.require("mode");
  const setupIssuer = determineIssuer(mode);

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
