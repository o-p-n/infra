import { all, ComponentResource, ComponentResourceOptions, Input, Output, output, secret } from "@pulumi/pulumi";
import * as YAML from "yaml";

import { ConnOptions } from "./conn";
import { LaunchConfigType, Microk8sInstance } from "./instance";

export interface Microk8sClusterInputs {
  hosts: string[];

  remote: Input<ConnOptions>;
  bastion?: Input<ConnOptions>;

  version?: Input<string>;
  launchConfig?: Input<LaunchConfigType>;
}

export class Microk8sCluster extends ComponentResource {
  readonly kubeconfig: Output<string>;

  constructor(domain: string, args: Microk8sClusterInputs, opts?: ComponentResourceOptions) {
    super("o-p-n:microk8s:Cluster", domain, {}, opts);

    let primary: Output<ConnOptions> | undefined = undefined;
    const resources: Microk8sInstance[] = [];
    for (const host of args.hosts) {
      const id = (domain === host) ? domain : `${domain}@${host}`;
      const res: Microk8sInstance = new Microk8sInstance(
        id,
        {
          ...args,
          hostname: host,
          primary,
        },
      );

      primary = primary ?? all([res.kubeconfig, res.hostname, args.remote]).apply(([_, host, remote]) => {
        const conn = {
          ...remote,
          host,
        };
        return conn;
      });
      resources.push(res);
    }

    let kubeconfig = all(
      resources.map(res => res.kubeconfig),
    ).apply(cfgs => {
      const cfgStr = cfgs[0];
      const config = YAML.parse(cfgStr);

      // fix-up server URL
      const cluster = config.clusters[0].cluster;
      const loc = new URL(cluster.server);
      loc.hostname = domain;
      cluster.server = loc.toString();

      return YAML.stringify(config);
    });
    kubeconfig = secret(kubeconfig);

    this.kubeconfig = kubeconfig;

    this.registerOutputs();
  }
}
