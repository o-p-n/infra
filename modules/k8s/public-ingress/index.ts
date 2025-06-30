import * as k8s from "@pulumi/kubernetes";

import { ModuleResult, ModuleResultSet } from "../_basics";
import { Config, Resource } from "@pulumi/pulumi";

import { issuerName as certManagerIssuerName } from "../certificates";
import { Settings as CfSettings } from "../../cloudflare/types";

const namespace = "public-ingress";

const versions: Record<string, string> = {
  "external-dns": "1.15.2",
};

const projectConfig = new Config("o-p-n");
const ingressConfig = new Config("public-ingress");

interface CertSpecProps {
  duration: string;
  renewBefore: string;
}
const CERT_DEFAULTS: CertSpecProps = {
  duration: "2160h",
  renewBefore: "720h",
}

interface ExternalDnsConfig {
  provider: string;
  accessToken: string;
  envVarName: string;
}

export default async function stack(provider: k8s.Provider, deployed: ModuleResultSet): Promise<ModuleResult> {
  const domain = projectConfig.require("domain");
  const gatewayAnnotations: Record<string, string> = {};
  const serviceType = ingressConfig.get("service-type");
  const gatewayName = "gateway";

  const ns = new k8s.core.v1.Namespace("public-ingress", {
    metadata: {
      name: namespace,
    },
  }, { provider });

  let extDnsConfig = ingressConfig.getSecretObject<ExternalDnsConfig>("external-dns");
  if (extDnsConfig) {
    const extDnsSecret = new k8s.core.v1.Secret("ext-dns-token", {
      metadata: {
        namespace,
        name: "ext-dns-token",
      },
      type: "Opaque",
      stringData: {
        ACCESS_TOKEN: extDnsConfig.apply(config => config.accessToken),
      },
    }, {
      provider,
      dependsOn: [ ns ],
    });
    const extDnsRelease = new k8s.helm.v3.Release(`${namespace}-ext-dns`, {
      chart: "external-dns",
      version: versions["external-dns"],
      namespace,
      repositoryOpts: {
        repo: "https://kubernetes-sigs.github.io/external-dns",
      },
      values: {
        provider: extDnsConfig.apply(config => config.provider),
        env: [
          {
            name: extDnsConfig.apply(config => config.envVarName),
            valueFrom: {
              secretKeyRef: {
                name: "ext-dns-token",
                key: "ACCESS_TOKEN",
              },
            },
          },
        ],
      },
    }, {
      dependsOn: [ ns ],
      provider,
    });  

    gatewayAnnotations["external-dns.alpha.kubernetes.io/hostname"] = domain;
  }
  if (serviceType) {
    gatewayAnnotations["networking.istio.io/service-type"] = serviceType;
  }

  const extraHosts: string[] = [];
  if (ingressConfig.getBoolean("local-hostname")) {
    const hostname = `${gatewayName}-istio.${namespace}.svc.cluster.local`;
    extraHosts.push(hostname)
  }

  const certSpec = ingressConfig.getObject<CertSpecProps>("cert-spec") ?? CERT_DEFAULTS;
  let certRes: Resource | undefined = undefined;
  if (projectConfig.getObject<Record<string, string>>("enabled")?.cloudflare) {
    const cfSettings = projectConfig.requireSecretObject<CfSettings>("cloudflare");
    const tlsKey = cfSettings.originKey;
    const tlsCert = cfSettings.originCert;

    certRes = new k8s.core.v1.Secret("public-ingress-cert", {
      metadata: {
        namespace,
        name: "public-ingress-cert",
      },
      type: "kubernetes.io/tls",
      stringData: {
        "tls.key": tlsKey,
        "tls.crt": tlsCert,
      },
    }, {
      provider,
    });
  }
  if (!certRes) {
    certRes = new k8s.apiextensions.CustomResource("public-ingress-cert", {
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
          ...extraHosts,
        ],
        ...certSpec,
      },
    }, {
      provider,
      dependsOn: [ ns, ...deployed.certManager.dependencies! ],
    });
  }

  const gatewayRes = new k8s.apiextensions.CustomResource("public-ingress-gateway", {
    apiVersion: "gateway.networking.k8s.io/v1beta1",
    kind: "Gateway",
    metadata: {
      name: gatewayName,
      namespace,
      annotations: gatewayAnnotations,
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
            ],
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
