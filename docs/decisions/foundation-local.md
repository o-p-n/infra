# Foundation Local — Design Decisions

Decisions for the `foundation/local` KinD cluster setup playbook, documented to prevent re-opening resolved issues.

---

## Kubeconfig Double-Write

**Status:** Intentional

The kubeconfig is written twice:
1. `kind create cluster --kubeconfig ~/.kube/local.config` — writes to a temporary location.
2. `kind get kubeconfig` + `copy` module — ensures the final file lands at `~/.kube/<cluster_name>.config` with `mode: "0600"`.

The `copy` module's explicit `0600` permission is the reason for the second write; `kind create cluster` does not guarantee this mode.

---

## Separate kubectl and Kind Versions

**Status:** Intentional

`kubectl_version` and `kind_kubernetes_version` are separate variables in `group_vars/all.yml`. kubectl updates are accepted more frequently than kind updates, so they are expected to drift. Linking them with a shared variable would prevent this natural divergence.

---

## Registry Image Unpinned

**Status:** Intentional

`registry_image: "docker.io/library/registry:3"` uses a major-version tag without a specific digest or minor version. The registry is only used for local development, testing, and troubleshooting — reproducibility is not a concern.

---

## No `.gitignore` in `foundation/local/`

**Status:** Intentional

Only the repo-root `.gitignore` is used. There is no need for a nested `.gitignore` in `foundation/local/`.

---

## Cluster Potentially Recreated on Every Run

**Status:** Intentional

The `kind delete cluster` task fires when the config template changes (`when: kind_config.changed`). Since the template is rendered with Jinja2 on every run, the cluster is always deleted and recreated. This is the desired behavior for local development — a fresh cluster each time.

---

## `shell` Module Over `command`

**Status:** Intentional

`ansible.builtin.shell` is used throughout the playbook instead of `ansible.builtin.command`. The playbook bootstraps a developer's local environment and requires shell features (variable expansion, tilde resolution, environment variable injection like `KUBECONFIG=~/.kube/local.config`) that `command` cannot handle.

---

## Single-Host Inventory

**Status:** Intentional

The inventory (`inventory/hosts.yml`) only supports localhost with `ansible_connection: ssh`. The playbook runs Ansible from a container that connects to the host via SSH. This is a local development tool, not a multi-host deployment.

---

## No `ansible-lint` Configuration

**Status:** Accepted

The Dockerfile installs `ansible-lint` but there is no `.ansible-lint` config file. Lint is not in the CI pipeline, so this is low priority.

---

## No Teardown Mechanism

**Status:** Accepted

There is no documented `--tags teardown` or standalone cleanup script. The cluster is recreated on every playbook run, which serves as an implicit teardown. A dedicated teardown path may be added in the future if needed.

---

## `kind create cluster` Multi-Line Command

**Status:** Accepted

The `kind create cluster` shell command uses YAML multiline scalar (`>`) for readability. The newlines are folded into spaces at runtime. This is a style preference — the command works correctly.
