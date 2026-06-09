# foundation:container - Containerized Ansible Environment

A Docker container providing a self-contained Ansible execution environment with Kind cluster support, Docker-in-Docker, and all required collections.

## PROVIDED

The container provides the following components:

| Category | Items |
|---|---|
| **APT** | `git`, `iputils-ping`, `openssh-client`, `sshpass` |
| **Python** | `ansible==13.5.0`, `ansible-lint==26.4.0`, `jmespath==1.1.0`, `netaddr==1.3.0`, `docker==7.1.0` |
| **Collections** | `community.general`, `ansible.posix`, `community.docker` |

## BUILDING

```bash
docker build -t o-p-n/ansible:latest .
```

## USING

Mount your project directory to `/workspace` inside the container to access playbooks, inventories, and group vars from the host. This directory is the default working directory.

To run an Ansible playbook:

```bash
docker run --rm -v $(pwd):/workspace o-p-n/ansible:latest playbook /workspace/playbook.yml
```

The playbook path can be relatvie to the `/workspace` path, or be an absolute path.

To run an ad-hoc Ansible command:

```bash
docker run --rm -v $(pwd):/workspace o-p-n/ansible:latest run -m ping all
```

All `ansible` CLI options are supported.

To open an interactive shell:

```bash
docker run --rm -it -v $(pwd):/workspace o-p-n/ansible:latest shell
```

