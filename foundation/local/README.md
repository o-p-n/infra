# compute.local - Local KinD Cluster Setup

This Ansible project provisions a local Kubernetes cluster using KinD (Kubernetes in Docker) with support for a local container registry.

## PREREQUISITES

The following must be installed and running on the target host **before** running the playbook:

- **Docker** engine version `29.0.0` or higher (desktop version `4.25` or higher)
- **Python** version `3.10` or higher
- **kind** version `0.31.0` or higher
- **ansible** version `13.0` or higher

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

| Variable | Default | Description |
|---|---|---|
| `kind_kubernetes_version` | `v1.31.0` | Kubernetes version for KinD nodes |
| `kind_node_count` | `1` | Number of worker nodes |
| `registry_host_port` | `12676` | Host port for the registry |
| `registry_container_port` | `5000` | Container port for the registry |
