# DEQAR admin UI

Next.js admin application backed by the DEQAR Django API. Authentication and API
proxying run on the Next.js server.

## Local development

```bash
npm ci
npm run dev
```

Configure development settings in `.env.local`, then open
[http://localhost:3000](http://localhost:3000). Development output uses `.next-dev`;
production builds use `.next`.

## Production with Docker Compose

Requires Docker with BuildKit and the Docker Compose plugin. The deployment assumes
an existing Django API and a host reverse proxy that terminates HTTPS.

1. Create the production configuration:

   ```bash
   cp .env.production.example .env.production
   chmod 600 .env.production
   openssl rand -base64 32
   ```

2. Edit `.env.production`: paste the generated value into `NEXTAUTH_SECRET`, set
   `NEXTAUTH_URL` to the admin's public HTTPS origin, set `DJANGO_API_BASE` to the
   API root reachable from the container, and replace the example public website
   URLs. Keep each literal `{id}` placeholder. The API root must include any path
   prefix expected before `/auth/jwt/create/` and other API endpoints, with no
   trailing slash. `localhost` in `DJANGO_API_BASE` means the admin container;
   use a reachable hostname, or a service name on a shared Docker network.

3. Build and start:

   ```bash
   docker compose --env-file .env.production build --pull
   docker compose --env-file .env.production up -d --wait
   ```

4. Configure the host reverse proxy to send the public admin hostname to
   `http://127.0.0.1:3000` (or the chosen `ADMIN_PORT`). Preserve `Host` and forward
   `X-Forwarded-Proto` and `X-Forwarded-For`. Set request size limits and timeouts
   to accommodate report and CSV uploads. HTTPS is required for the application's
   secure authentication cookies.

The port binds only to host loopback. If the reverse proxy runs in Docker, attach
both services to a shared network and proxy to `admin:3000`; adapt the Compose
network configuration to your deployment.

### Configuration

| Variable | When used | Purpose |
| --- | --- | --- |
| `NEXTAUTH_URL` | Runtime | Public HTTPS origin of the admin UI |
| `NEXTAUTH_SECRET` | Runtime | Persistent, randomly generated authentication secret |
| `DJANGO_API_BASE` | Runtime | Django API root reachable from the container |
| `REACT_APP_WEBSITE_AGENCY` | Build | Public agency URL template containing `{id}` |
| `REACT_APP_WEBSITE_COUNTRY` | Build | Public country URL template containing `{id}` |
| `REACT_APP_WEBSITE_INSTITUTION` | Build | Public institution URL template containing `{id}` |
| `REACT_APP_WEBSITE_REPORT` | Build | Public report URL template containing `{id}` |
| `REACT_APP_ESCO_API` | Build | Browser-accessible ESCO search endpoint |
| `ADMIN_PORT` | Compose | Host loopback port; defaults to `3000` |
| `IMAGE_TAG` | Compose | Local image tag; defaults to `latest` |

Compose supplies `NEXTAUTH_URL_INTERNAL=http://127.0.0.1:3000` for internal auth
requests. Keep `NEXTAUTH_SECRET` stable across restarts and replicas; replacing it
invalidates existing sessions.

Public URL settings are embedded in browser assets through `next.config.mjs` and
require a rebuild when changed. Runtime settings are passed to the container and
are never supplied as Docker build arguments. The Docker build context excludes
all `.env` files, dependencies, local build output, and Git metadata. Compose
explicitly passes only the server's runtime settings; `.env.local` is not used.

### Image and operations

The multi-stage Dockerfile uses Node.js 24, installs the exact npm lockfile with
`npm ci`, and copies Next.js [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output),
static assets, and public files into the final image. It runs as UID/GID 1001.
Compose enables an init process, a read-only root filesystem, temporary writable
directories for `/tmp` and the Next.js cache, dropped Linux capabilities, log
rotation, and automatic restart after process exits or host restarts. Cache data
is disposable and is lost when the container is recreated.

`GET /api/health` is an unauthenticated liveness endpoint checked by Docker. It
checks the Next.js server without calling Django. A failing health check marks
the container unhealthy; Docker's restart policy only restarts exited processes.

```bash
# Inspect status and recent application logs.
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 -f admin

# Rebuild after source/public URL changes or to pick up base-image updates.
docker compose --env-file .env.production build --pull
docker compose --env-file .env.production up -d --wait

# Recreate after runtime configuration changes (no rebuild required).
docker compose --env-file .env.production up -d --wait --force-recreate

# Stop the deployment.
docker compose --env-file .env.production down
```

Use a release-specific `IMAGE_TAG` if you need to retain images for rollback.
