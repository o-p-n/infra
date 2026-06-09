# foundation:local - Local KinD Cluster Setup

This Ansible project provisions a local Kubernetes cluster using KinD (Kubernetes in Docker) with support for a local container registry.

Ansible runs in a container with host-based networking support, and drives changes to the local system via SSH. The output is a KinD cluster named `local` with 4 nodes, plus and a local registry running on `localhost:12676`. The name, node count, and registry information are configurable.

## PREREQUISITES

The following must be installed and running on the target host **before** running the playbook:

- **SSH** server and agent running locally
- **Docker** engine version `29.0.0` or higher (desktop version `4.25` or higher) with `--network=host` support
  - Docker Desktop needed for MacOS
- **Python** version `3.10` or higher
- **kind** version `0.31.0` or higher
- **kubectl** version `1.34.0` or higher

## USING

### Running Playbooks

Apply the default playbook:

```bash
./run.sh playbook playbook.yml
```

Apply a specific tag or skip certain tasks:

```bash
./run.sh playbook playbook.yml --tags kind-cluster
./run.sh playbook playbook.yml --skip-tags local-registry
```

Run with extra variables:

```bash
./run.sh playbook playbook.yml -e kind_node_count=2
```

### Running Ad-Hoc Commands

Execute ad-hoc Ansible commands against the inventory:

```bash
./run.sh run all -m ping
./run.sh run kind_hosts -a "systemctl status docker"
```

## CONFIGURING

Edit `group_vars/all.yml` to customize:

| Variable | Description |
|---|-|
| `temp_dir` | Temporary directory for intermediate files |
| `remote_path` | Remote PATH for executable locations |
| `kind_cluster_name` | Name of the KinD cluster |
| `kind_kubernetes_version` | Kubernetes version for KinD nodes |
| `kind_node_count` | Number of worker nodes |
| `kubectl_version` | kubectl client version |
| `registry_host` | Hostname for the registry |
| `registry_host_port` | Host port for the registry |
| `registry_container_name` | Name of the registry container |
| `registry_container_port` | Internal port of the registry container |
| `registry_image` | Registry container image |
