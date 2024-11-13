import * as k8s from "@pulumi/kubernetes";
import { Config } from "@pulumi/pulumi";
import { namespace as certManagerNamespace } from "../cert-manager";

const config = new Config();

export function setupIssuer(provider: k8s.Provider) {
  const accessToken = config.requireSecret("acme-access-token");
  const email = config.require("acme-email");

  const resource = new k8s.core.v1.Secret("cert-manager-creds", {
    metadata: {
      namespace: certManagerNamespace,
      name: "cert-manager-creds",
    },
    type: "Opaque",
    stringData: {
      ACCESS_TOKEN: accessToken,
    },
  }, { provider });

  const spec = {
    acme: {
      email,
      server: "https://acme-v02.api.letsencrypt.org/directory",
      privateKeySecretRef: {
        name: "cert-manager-account-key"
      },
      solvers: [
        {
          dns01: {
            digitalocean: {
              tokenSecretRef: {
                name: resource.metadata.name,
                key: "ACCESS_TOKEN",
              },
            },
          },
        },
      ],
    },
  };

  return {
    resource,
    spec,
  };
}
