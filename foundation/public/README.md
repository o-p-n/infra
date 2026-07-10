# foundation:public - MicroK8s Cluster Setup

This Ansible project provisions a MicroK8s cluster on remote hosts.

Ansible runs in a container with host-based networking support, and drives changes to the target hosts via SSH. The output is a MicroK8s cluster configured with the specified domain and version.

## PREREQUISITES

The following must be installed and running on the target host **before** running the playbook:

 - **SSH** server and agent running locally
 - **Python** version `3.10` or higher

## USING

> [!IMPORTANT]
> The Ansible container cannot prompt for passwords; this can prevent it from connecting to your target machines (which it does over SSH). Work around this by using SSH keys and preloading your key with `ssh-add`:
>
> ```
> ssh-add ~/.ssh/id_ed25519
> ```

### Running Playbooks

Apply the default playbook:

```bash
./run.sh playbook playbook.yaml
```

Apply a specific tag or skip certain tasks:

```bash
./run.sh playbook playbook.yaml --tags microk8s-install
./run.sh playbook playbook.yaml --skip-tags microk8s-join
```

Run with extra variables:

```bash
./run.sh playbook playbook.yaml -e microk8s_domain=example.com
```

### Running Ad-Hoc Commands

Execute ad-hoc Ansible commands against the inventory:

```bash
./run.sh run all -m ping
```

## CONFIGURING

Edit `group_vars/all.yaml` to customize:

| Variable | Description |
|---|-|
| `microk8s_domain` | Domain used for MicroK8s configuration |
| `microk8s_version` | MicroK8s version (e.g., `1.34/stable`) |
