# outer-planes.net Infrastructure

This repository manages the base infrastructure for [outer-planes.net](https://outer-planes.net).

## ARCHITECTURE

The infrastructure is managed in two sequential layers:

- **[foundation](./foundation/)**: Provides the base cluster environments and execution tooling. This is the first layer to be applied.
- **[framing](./framing/)**: Provisions Kubernetes resources and services on top of the established foundation.

## QUICK START

To interact with this repository, use `foundation` for the foundational compute resources (kubernetes runtime) and `framing` for the common kubernetes framework resources.

### 1. Foundation

Navigate to the `foundation` directory to provision clusters using the provided scripts.

```bash
cd foundation

# one-time action: creates the provisioning container
cd container && make build

# Example for local cluster
cd local && ./run.sh playbook playbook.yaml
```

#### 2. Framing

Navigate to the `framing` directory to provision Kubernetes infrastructure on top of the cluster.
> [!IMPORTANT]
> You must set the `PULUMI_CONFIG_PASSPHRASE` environment variable to unlock secrets.

```bash
cd framing
export PULUMI_CONFIG_PASSPHRASE=<your-secret-passphrase>
pulumi up --stack <stack>
```

*For detailed configuration and usage instructions, please refer to the individual `README.md` files in each sub-project.*

