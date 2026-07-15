# compute - Kubernetes Infrastructure Provisioning

This project uses Pulumi to provision and manage Kubernetes infrastructure for different environments (local and public).

## PREREQUISITES

The following must be installed on your local machine **before** running Pulumi commands:

- **[Pulumi](https://www.pulumi.com/)**
- **[Node.js](https://nodejs.org/)** (version `18` or higher recommended)
- **[kubectl](https://kubernetes.io/docs/reference/kubectl/)**

## USING

This project provides two main stacks: `local` (for KinD clusters) and `public` (for MicroK8s/Cloudflare managed infrastructure).

> [!IMPORTANT]
> This project uses encrypted secrets. You must set the `PULUMI_CONFIG_PASSPHRASE` environment variable with your secret passphrase for the desired stack to unlock the configuration:
>
> ```bash
> export PULUMI_CONFIG_PASSPHRASE=<your-secret-passphrase>
> ```

### Running Pulumi

To use a specific environment, select the corresponding stack:

#### Local Environment (KinD)

Use the `local` stack for development in a KinD cluster:

```bash
# Preview changes
pulumi preview --stack local

# Deploy infrastructure
pulumi up --stack local
```

#### Public Environment (MicroK8s + Cloudflare)

Use the `public` stack for production-like environments:

```bash
# Preview changes
pulumi preview --stack public

# Deploy infrastructure
pulumi up --stack public
```
## CONFIGURING

Configuration is managed via Pulumi stack files.

### Local Configuration (`Pulumi.local.yaml`)

Key settings for the local environment:

| Variable | Description |
| --- | --- |
| `o-p-n:compute-base` | Set to `kind` for local development |
| `o-p-n:domain` | The domain name used for the cluster |
| `certificates:mode` | Certificate mode (e.g., `self-ca`) |


### Public Configuration (`Pulumi.public.yaml`)

Key settings for the public environment:

| Variable | Description |
| --- | --- |
| `o-p-n:compute-base` | Set to `microk8s` for public infrastructure |
| `o-p-n:domain` | The public domain name |
| `o-p-n:cloudflare:account` | Cloudflare account ID |
| `o-p-n:cloudflare:zone` | Cloudflare zone ID |

### Available Modules

The following modules are provisioned by default:

| Module | Description |
| --- | --- |
| `infraCore` | Core Kubernetes infrastructure |
| `istioSystem` | Istio service mesh installation |
| `certManager` | Cert-manager for certificate management |
| `publicIngress` | Ingress controller configuration |
| `certificates` | Management of SSL/TLS certificates |
| `monitoring` | Monitoring stack (Prometheus/Grafana) |

*Note: The `cloudflare` module is only enabled if configured in the `public` stack.*

