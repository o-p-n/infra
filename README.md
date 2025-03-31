# outer-planes.net Kubernetes Infrastructure

This repository manages the base infrastructure for [outer-planes.net](https://outer-planes.net):

* Foundational compute and networking resources
* Kubernetes cluster

The resources are divided into two projects:
* `o-p-n.compute` for the foundational compute and networking resources
* `o-p-n.k8s` for the base-level kubernetes resources

Further, there are three stacks:
* `local` for local development and testing, using [KinD](https://kind.sigs.k8s.io/)
* `intranet` for shared semi-private workloads on a home lab, using [microk8s]([https](https://microk8s.io/)
* `public` for public-fasing workloads on [Digital Ocean](digitalocean.com), using DOKS (Digital Ocean Kubernetes Service)

Resources are provisioned using [Pulumi](https://pulumi.com).  The backend state is managed on a local filesystem and secrets are managed using separate per-environment passphrases.

## PREREQUISITES

The following components are necessary to deploy infrastructure:
* `pulumi` command-line interface, latest version
* Docker engine, version 24 or later
* `kind` (for `local`), version 0.27.0 or later
* `kubectl`, version 1.31 or later

In addition, an up-to-date copy of the state backend and its associated passphrase are needed.  Both are maintained separate from this repository at present.

## DEPLOYING

Deploying updates involves the following process (per environment "stack"):
1. declare the relevant stack passphrase.
   > Export the relevant passphrase in the `PULUMI_CONFIG_PASSPHRASE` environment variable

2. deploy the `projects/o-p-n.compute` project:
   ```bash
   cd projects/o-p-n.compute
   pulumi -s <stack> up
   cd ../..
   ```

3. deploy the `projects/o-p-n.k8s` project:
   ```bash
   cd projects/o-p-n.k8s
   pulumi -s <stack> up
   cd ../..
   ```
