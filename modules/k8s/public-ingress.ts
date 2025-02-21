import * as k8s from "@pulumi/kubernetes";

import { ModuleResult, ModuleResultSet } from "./_basics";
import { Config } from "@pulumi/pulumi";

import { issuerName as certManagerIssuerName } from "./certificates";

const namespace = "public-ingress";

const projectConfig = new Config("o-p-n");
const ingressConfig = new Config("public-ingress");

interface PublicIngressProps {
  cert: CertProps;
}

interface CertProps {
  duration: string;
  renewBefore: string;
}
const CERT_DEFAULTS: CertProps = {
  duration: "2160h",
  renewBefore: "720h",
}

export default async function stack(provider: k8s.Provider, deployed: ModuleResultSet): Promise<ModuleResult> {
  const domain = projectConfig.require("domain");

  const ns = new k8s.core.v1.Namespace("public-ingress", {
    metadata: {
      name: namespace,
    }
  }, { provider });

  const spec = (ingressConfig.getObject<PublicIngressProps>("public-ingress")?.cert) ?? CERT_DEFAULTS;
  const certRes = new k8s.apiextensions.CustomResource("public-ingress-cert", {
    apiVersion: "cert-manager.io/v1",
    kind: "Certificate",
    metadata: {
      name: "public-ingress-cert",
      namespace,
    },
    "spec": {
      secretName: "public-ingress-cert",
      issuerRef: {
        kind: "ClusterIssuer",
        name: certManagerIssuerName,
      },
      isCA: false,
      privateKey: {
        algorithm: "ECDSA",
        size: 256,
      },
      dnsNames: [
        domain,
        `*.${domain}`,
      ],
      ...spec,
    },
  }, {
    provider,
    dependsOn: [ ns, ...deployed.certManager.dependencies! ],
  });

  const gatewayRes = new k8s.apiextensions.CustomResource("public-ingress-gateway", {
    apiVersion: "gateway.networking.k8s.io/v1beta1",
    kind: "Gateway",
    metadata: {
      name: "gateway",
      namespace,
    },
    spec: {
      gatewayClassName: "istio",
      listeners: [
        {
          name: "https",
          port: 443,
          protocol: "HTTPS",
          tls: {
            mode: "Terminate",
            "certificateRefs": [
              {
                name: "public-ingress-cert",
              },
            ]
          },
          allowedRoutes: {
            namespaces: { from: "All" },
          },
        },
        {
          name: "http",
          port: 80,
          protocol: "HTTP",
          "allowedRoutes": {
            "namespaces": { from: "All" },
          },
        },
      ],
    },
  }, {
    provider,
    dependsOn: [ns, ...deployed.istioSystem.dependencies! ],
  });

  const routeRedirectRes = new k8s.apiextensions.CustomResource("public-ingress-http-redirect", {
    apiVersion: "gateway.networking.k8s.io/v1beta1",
    kind: "HTTPRoute",
    metadata: {
      name: "http-redirect",
      namespace,
    },
    spec: {
      parentRefs: [
        {
          name: gatewayRes.metadata.name,
          namespace: gatewayRes.metadata.namespace,
          sectionName: "http",
        },
      ],
      rules: [
        {
          filters: [
            {
              type: "RequestRedirect",
              requestRedirect: {
                scheme: "https",
                statusCode: 301,
              },
            },
          ],
        },
      ],
    },
  }, {
    provider,
    dependsOn: [ns, ...deployed.infraCore.dependencies! ],
  });

  return {
    namespace: ns,
    resources: [ certRes, gatewayRes, routeRedirectRes ],
  }
}
