# Foundation - Basic Infrastructure

Kubernetes cluster environments for `outer-planes.casa`.

This directory contains infrastructure for provisioning and configuring Kubernetes clusters across different environments. The foundation supports two environments:

- **local** — a local KinD cluster with a built-in container registry.
- **public** — a MicroK8s cluster on remote hosts.

## PREREQUISITES

The following must be installed and running on the target host(s) before running the playbooks:

- **SSH** server and agent running
- **Python** version `3.10` or higher

Additionally, each environment has its own prerequisites.

### `local` Environment Prerequisites

- **docker** engine version `29.0.0` or higher 
- **kind** version `0.31.0` or higher
- **kubectl** version `1.34.0` or higher

### `public` Environment Prerequisites

- **snap** installed and configured

## SUPPORT

The **`container`** (./container/) module provisions an Ansible execution environment as a Docker container.

## GETTING STARTED

Build or update the Ansible container then run the playbook for the desired environment:

```bash
cd foundation/container && make build
./run.sh playbook local
```

## USING

> [!IMPORTANT]
> The Ansible container cannot prompt for passwords; this can prevent it from connecting to your local development machine (which it does over SSH). Work around this by using SSH keys and preloading your key with `ssh-add`:
>
> ```
> ssh-add ~/.ssh/id_ed25519
> ```

The playbooks, inventories, and group variables are named for their respective environment.

- **inventory**
  - `local` — the local machine
  - `public` — the remote hosts by name

### Running Playbooks

Apply the default playbook for a given environment (`local` or `public`):

```bash
./run.sh playbook local
```

Apply a specific tag or skip certain tasks

```bash
./run.sh playbook public --tags microk8s-install
./run.sh playbook public --skip-tags microk8s-join
```
Run with extra variables:

```bash
./run.sh playbook local -e kind_node_count=2
```

### Running Ad-Hoc Commands

Execute ad-hoc Ansible commands against the inventory:

```bash
./run.sh run all -m ping
./run.sh run local -a "systemctl status docker"
```

### Ansible execution environment shell

Start an interactive shell within the Ansible container:

```bash
./run.sh shell
```

## CONFIGURING

### Global variables

Edit `group_vars/all.yaml` to customize:

| Variable | Description |
|---|-|
| `kubernetes_major` | Major version of Kubernetes |
| `kubernetes_minor` | Minor version of Kubernetes |
| `kubernetes_patch` | Patch version of Kubernetes |
| `kubernetes_version_short` | Short version string of Kubernetes |
| `kubernetes_version_full` | Full version string of Kubernetes |

### `local` variables

Edit `group_vars/local.yaml` to customize:

| Variable | Description |
|---|-|
| `temp_dir` | Temporary directory for intermediate files |
| `remote_path` | Remote PATH for executable locations |
| `kind_cluster_name` | Name of the KinD cluster |
| `kind_kubernetes_version` | Kubernetes version for KinD nodes |
| `kind_node_image` | Image for KinD nodes |
| `kind_node_count` | Number of worker nodes |
| `kubectl_version` | kubectl client version |
| `registry_host` | Hostname for the registry |
| `registry_host_port` | Host port for the registry |
| `registry_container_port` | Internal port of the registry container |
| `registry_container_name` | Name of the registry container |
| `registry_image` | Registry container image |

### `public` variables

Edit `group_vars/public.yaml` to customize:

| Variable | Description |
|---|-|
| `microk8s_domain` | Domain used for MicroK8s configuration |
| `microk8s_version` | MicroK8s version (e.g., `1.34/stable`) |

