import * as k8s from "@pulumi/kubernetes";
import { Config } from "@pulumi/pulumi";
import { namespace as certManagerNamespace } from "../cert-manager";

const config = new Config("certificates");

interface TlsSecretProps {
  crt: string;
  key: string;
}

export function setupIssuer(provider: k8s.Provider) {
  const selfCa = config.requireSecretObject<TlsSecretProps>("self-ca");

  const resource = new k8s.core.v1.Secret("cert-manager-creds", {
    metadata: {
      name: "cert-manager-creds",
      namespace: certManagerNamespace,
    },
    type: "kubernetes.io/tls",
    stringData: selfCa.apply(props => ({
      "tls.crt": props.crt,
      "tls.key": props.key,
    })),
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
