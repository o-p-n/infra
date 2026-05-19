# compute.local - Local KinD Cluster Setup

This Ansible project provisions a local Kubernetes cluster using KinD (Kubernetes in Docker) with support for a local container registry.

## Prerequisites

The following must be installed and running on the target host **before** running the playbook:

- **Docker** — the Docker daemon must be running and accessible (the playbook container mounts `/var/run/docker.sock`)
- **SSH server** — an SSH server must be running on the host so the playbook container can connect back to `localhost`
- **ssh-agent** — an active ssh-agent with your key loaded, forwarded into the playbook container

## Usage

Run the playbook from within a Docker container:

```bash
./run.sh
```

## Configuration

Edit `group_vars/all.yml` to customize:

| Variable | Default | Description |
|---|---|---|
| `kind_kubernetes_version` | `v1.31.0` | Kubernetes version for KinD nodes |
| `kind_node_count` | `1` | Number of worker nodes |
| `registry_host_port` | `12676` | Host port for the registry |
| `registry_container_port` | `5000` | Container port for the registry |

## Project Structure

```
compute.local/
├── ansible.cfg
├── inventory/
│   └── hosts
├── group_vars/
│   └── all.yml
├── roles/
│   ├── kind-cluster/
│   └── local-registry/
└── playbook.yml
```
