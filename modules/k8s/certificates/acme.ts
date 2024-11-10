import * as k8s from "@pulumi/kubernetes";
import { Config } from "@pulumi/pulumi";

const config = new Config();

export function setupIssuer(provider: k8s.Provider) {
  const creds = config.requireSecret("acme-creds");
  const email = config.require("acme-email");

  const resource = new k8s.core.v1.Secret("cert-manager-creds", {
    metadata: {
      name: "cert-manager-creds",
    },
    type: "Opaque",
    stringData: {
      ACCESS_TOKEN: creds,
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
