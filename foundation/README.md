# Foundation - Basic Infrastructure

Kubernetes cluster environments for `outer-planes.casa`.

This directory contains infrastructure for provisioning and configuring Kubernetes clusters across different environments.

## ENVIRONMENTS

- **`local`** (./local/) Provisions a local KinD cluster with a built-in container registry.
- **`public`** (./public/) Provisions a MicroK8s cluster on remote hosts.

## SUPPORT

- **`container`** (./container/) Provides the Ansible execution environment as a Docker container.

## GETTING STARTED

### 1. Build the Ansible container
```bash
cd foundation/container && make build
```

### 2. Provision a cluster
Navigate to the target environment and use the provided `run.sh` script.

**Local Cluster:**
```bash
cd foundation/local && ./run.sh playbook playbook.yaml
```

**Public Cluster:**
```bash
cd foundation/public && ./run.sh playbook playbook.yaml
```

*Refer to each sub-project's `README.md` for specific configuration and usage details.*
