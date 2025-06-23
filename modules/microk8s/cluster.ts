import { all, ComponentResource, ComponentResourceOptions, Input, Output, secret } from "@pulumi/pulumi";
import * as log from "@pulumi/pulumi/log";
import * as YAML from "yaml";

import { ConnOptions } from "./conn";
import { ControlPlane, LaunchConfigType, Microk8sInstance } from "./instance";

export interface Microk8sClusterInputs {
  hosts: string[];

  remote: Input<ConnOptions>;
  bastion?: Input<ConnOptions>;
  controlPlane?: Input<ControlPlane>;

  version?: Input<string>;
  launchConfig?: Input<LaunchConfigType>;
}

export class Microk8sCluster extends ComponentResource {
  readonly kubeconfig: Output<string>;
  readonly cidrs: Output<string[][]>;

  constructor(domain: string, args: Microk8sClusterInputs, opts?: ComponentResourceOptions) {
    super("o-p-n:microk8s:Cluster", domain, {}, opts);

    let primary: Output<ConnOptions> | undefined = undefined;
    const resources: Microk8sInstance[] = [];
    for (const hostname of args.hosts) {
      const id = (domain === hostname) ? domain : `${domain}@${hostname}`;
      const res: Microk8sInstance = new Microk8sInstance(
        id,
        {
          ...args,
          hostname,
          primary,
        },
      );

      primary = primary ?? all([res.hostname, args.remote, res.kubeconfig]).apply(([host, remote]) => {
        log.debug(`setting ${host} as primary`);
        const conn = {
          ...remote,
          host,
        };
        return conn;
      });
      resources.push(res);
    }

    const fixup = [
      args.controlPlane,
      ...resources.map(res => res.kubeconfig),
    ];
    let kubeconfig = all(
      fixup
    ).apply(args => {
      const controlPlane = args[0] as ControlPlane;
      const hostname = controlPlane.hostname;
      const proxy = controlPlane.proxy;

      const cfgStr = args[1] as string;
      const config = YAML.parse(cfgStr);

      const info = config.clusters[0];

      // fix-up server URL
      const cluster = info.cluster;
      const loc = new URL(cluster.server);
      loc.hostname = hostname || domain;
      cluster.server = loc.toString();

      // add proxy
      if (proxy) {
        cluster["proxy-url"] = proxy;
      }

      return YAML.stringify(config);
    });
    kubeconfig = secret(kubeconfig);

    this.kubeconfig = kubeconfig;
    let cidrs = all(
      resources.map(res => res.cidrs),
    );
    this.cidrs = cidrs;

    this.registerOutputs();
  }
}
