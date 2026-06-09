# Foundation - Basic Infrastructure

Kubernetes cluster environments for `outer-planes.net` in various environments.

This directory contains the infrastructure that provisions and configures Kubernetes clusters across different environments. Each sub-project targets a specific deployment context — starting with a local KinD cluster, with additional environments planned.

## USAGE

### ENVIRONMENTS
- **`local`**_(./local/)_ Provision a local KinD (Kubernetes in Docker) cluster with a built-in container registry, driven by Ansible playbooks.

### SUPPORT

The `container` sub-project defines an Ansible execution environment, as a Docker container.



## GETTING STARTED

Build the Ansible container:

```bash
cd foundation/container && docker build -t o-p-n/ansible:latest .
```

Provision the local cluster:

```bash
cd foundation/local && ./run.sh playbook playbook.yml
```

See each sub-project's README for details.
