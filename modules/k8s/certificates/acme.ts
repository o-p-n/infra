import * as k8s from "@pulumi/kubernetes";
import { Config } from "@pulumi/pulumi";
import { namespace as certManagerNamespace } from "../cert-manager";

const config = new Config("certificates");

interface AcmeProps {
  email: string;
  accessToken: string;
}
export function setupIssuer(provider: k8s.Provider) {
  const acme = config.requireSecretObject<AcmeProps>("acme");

  const resource = new k8s.core.v1.Secret("cert-manager-creds", {
    metadata: {
      namespace: certManagerNamespace,
      name: "cert-manager-creds",
    },
    type: "Opaque",
    stringData: {
      ACCESS_TOKEN: acme.apply(props => props.accessToken),
    },
  }, { provider });

  const spec = {
    acme: {
      email: acme.apply(props => props.email),
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
