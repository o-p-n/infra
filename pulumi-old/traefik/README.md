# TRAEFIK Ingress Proxy

Traefik serves as the primary entrypoint to `outer-planes.net`'s public infrastructure.

## DEPLOYING

To deploy:

```
TRAEFIK_ADMIN_CREDS=$(pulumi config get traefik_admin_creds) docker --context o-p.n stack deploy -c ./docker-compose.yaml traefik
```
