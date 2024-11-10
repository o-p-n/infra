import * as k8s from "@pulumi/kubernetes";
import { Config } from "@pulumi/pulumi";
import { namespace as certManagerNamespace } from "../cert-manager";

const config = new Config();

export function setupIssuer(provider: k8s.Provider) {
  const crt = config.requireSecret("self-ca-crt");
  const key = config.requireSecret("self-ca-key");

  const resource = new k8s.core.v1.Secret("cert-manager-creds", {
    metadata: {
      name: "cert-manager-creds",
      namespace: certManagerNamespace,
    },
    type: "kubernetes.io/tls",
    stringData: {
      "tls.crt": crt,
      "tls.key": key,
    },
  }, { provider });

  const spec = {
    ca: {
      secretName: resource.metadata.name,
    },
  };

  return {
    resource,
    spec,
  };
}
