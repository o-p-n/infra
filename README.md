# outer-planes.net Kubernetes Infrastructure

This repository manages the base infrastructure for [outer-planes.net](https://outer-planes.net):

* Kubernetes cluster
* Foundational resources

Resources are provisioned using [Pulumi](https://pulumi.com), with three stacks that represent the deployment environment.

The backend is the Pulumi Cloud, and secrets are managed using a separate per-environment passphrase.
