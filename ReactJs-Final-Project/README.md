# HMS

Hospital management app: patients book appointments, doctors prescribe, admins manage doctors.

```
client/   React 19 + TS + MUI, axios + React Query hooks, react-hook-form + zod
server/   Node 24 + TS + Express 5 (MVC), MongoDB, Redis, zod — one folder per microservice + shared/
nginx/    gateway: serves the SPA, routes /api per service, per-pod load balancing, rate limiter
k8s/      Kubernetes manifests: services autoscale 1–20 pods
k8s/observability/  Grafana + Loki (logs) + Prometheus (metrics) + Tempo (traces), installed with Helm
e2e/      Playwright (UI flows + API: auth rotation, idempotency, validation)
load/     k6 load test
```

## Services

| Service | Owns | Routes | Database |
|---|---|---|---|
| `identity` | accounts, sessions, doctor/patient directory | `/api/auth/*`, `/api/doctors`, `/api/patients` | `hms_identity` |
| `appointments` | bookings, prescriptions | `/api/appointments`, `/api/prescriptions` | `hms_appointments` |

```
server/
  shared/src/        bootstrap (probes, logging, graceful shutdown), JWT verify, middleware, redis, logger
  identity/          Dockerfile + src/{index, config, routes, schemas}.ts, models/User, controllers/{auth,users},
                     lib/{tokens, seedAdmin}
  appointments/      Dockerfile + src/{index, config, routes, schemas}.ts, models/Appointment,
                     controllers/appointments, lib/identityClient, middleware/idempotency
```

Each service has its own image (`hms-identity`, `hms-appointments`) holding only `shared/` and its own
folder; one `package.json`/lockfile in `server/` keeps dependency versions identical across services.
They share only the JWT secret (each verifies tokens itself) and talk over
HTTP: booking asks `identity` for the doctor (`GET /api/doctors/:id`), forwarding the user's token and
request id; if identity is down, booking returns a 503 "please retry" while reads keep working.

## Run (Kubernetes)

Needs metrics-server for the autoscaler (Docker Desktop's cluster ships without it):

```sh
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.9.1/components.yaml
# Docker Desktop / kind only (self-signed kubelet certs):
kubectl -n kube-system patch deploy metrics-server --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

docker build -t hms-identity:dev -f server/identity/Dockerfile server
docker build -t hms-appointments:dev -f server/appointments/Dockerfile server
docker build -t hms-gateway:dev -f nginx/Dockerfile .

cp .env.example .env                      # set JWT_SECRET and the admin login
kubectl apply -f k8s/namespace.yaml
kubectl -n hms create secret generic hms-secrets --from-env-file=.env
kubectl apply -k k8s/                     # http://localhost:8080 (gateway LoadBalancer)
kubectl -n hms get hpa -w                 # watch replicas follow the load
```

After rebuilding an image with the same `:dev` tag, the cluster node keeps its cached copy. Load the new one
and restart (Docker Desktop shown; on kind use `kind load docker-image`):

```sh
docker save hms-gateway:dev | docker exec -i desktop-control-plane ctr -n k8s.io images import -
kubectl -n hms rollout restart deploy/gateway
```

On a remote cluster, push the three images to a registry and set `image:` in `k8s/*.yaml`.

### Observability (optional)

```sh
brew install helm                         # once
./k8s/observability/install.sh            # prints the Grafana admin password
open http://localhost:3000/d/hms-overview # "HMS overview" dashboard
```

| Signal | How it gets there | Where to look |
|---|---|---|
| Logs | JSON lines on stdout → Grafana Alloy → Loki (`level` promoted to a label) | dashboard log panels, Explore → Loki: `{namespace="hms", app="appointments"} \| json \| status >= 500` |
| Metrics | OpenTelemetry in each service exposes `:9464/metrics` → Prometheus (PodMonitor); cluster/HPA metrics from kube-state-metrics | dashboard: req/s, 5xx, p95 per service and route, pods vs autoscaler, CPU per pod |
| Traces | nginx (`ngx_otel_module`) starts the trace, services continue it (HTTP, Express, Mongoose, ioredis, fetch) → Tempo | click a `traceId` in any log line; dashboard service graph |

Every log line carries `reqId` and `traceId`; paste either into the dashboard's *Search logs* box to see
one request across gateway → appointments → identity. Tracing is wired via the Dockerfile's
`--import ./shared/src/tracing.ts` and standard `OTEL_*` env vars in `k8s/*.yaml`; without the
observability stack installed the app runs unchanged (exports just go nowhere).

Load test through the gateway (one IP, so expect mostly 429s once over the rate limit):

```sh
kubectl -n hms run k6 --rm -i --restart=Never --image=grafana/k6:1.4.0 \
  --env BASE_URL=http://gateway:8080 --env ADMIN_EMAIL=... --env ADMIN_PASSWORD=... -- run - < load/api.js
```

To drive the autoscaler, skip the per-IP rate limit and load the services directly:

```sh
kubectl -n hms run k6 --rm -i --restart=Never --image=grafana/k6:1.4.0 \
  --env IDENTITY_URL=http://identity:4000 --env APPOINTMENTS_URL=http://appointments:4000 \
  --env ADMIN_EMAIL=... --env ADMIN_PASSWORD=... --env VUS=200 --env HOLD=5m -- run - < load/api.js
```

The admin account is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on first start.

- Unit tests: `cd client && npm test`
- E2E (deployed, gateway on localhost:8080): `cd e2e && npm ci && npx playwright install chromium && npm test`
- Dev without Kubernetes: Mongo + Redis on localhost, then in `server/` `npm run dev:identity` (:4000) and
  `npm run dev:appointments` (:4001), and `cd client && npm run dev` (Vite proxies `/api` to the right one).

## How it works

- **Auth**: login returns a 15-min JWT access token (sent as `Authorization: Bearer`, kept in memory only)
  and sets an opaque refresh token in an httpOnly, `SameSite=Strict` cookie scoped to `/api/auth`.
  Refresh tokens are stored hashed in Redis, single-use (rotated on every refresh) and revoked on logout.
  The axios interceptor refreshes once on a 401 and replays the request.
- **Server (MVC)**, per service: `models/` (mongoose) → `controllers/` → `routes.ts`; JSON is the view (`models/json.ts`).
  Every body and `:id` param is validated by zod (each service's `schemas.ts`, `shared/src/middleware/validate.ts`).
- **Caching**: the doctor list is cached in Redis (5 min, cleared on create/delete); see `X-Cache`.
- **Idempotency**: `POST /appointments` and `POST /appointments/:id/prescription` honor an
  `Idempotency-Key` header (24 h, per user); the client sends one on every booking/prescription.
- **Gateway / load balancing**: nginx routes `/api` by path to each service. Each service has a headless
  Service whose DNS returns one IP per *ready* pod; nginx re-resolves it every 5 s (`resolve`) and sends
  each request to the pod with the fewest active connections (`least_conn`). New pods start taking
  traffic within seconds of the HPA adding them; draining or crashed pods drop out the same way.
  Rate limits: `/api` 20 r/s per IP (burst 40), login/signup 10 r/min (burst 20), then 429.
- **Autoscaling**: each service has an HPA, 1–20 pods, target 60% of the 100m CPU request. Scale-up is
  immediate (double or +4 pods every 15 s); scale-down waits 2 min and halves at most once a minute.
- **Crashes and shutdowns**:
  - a pod that dies mid-request: nginx retries on another pod (never POST/PATCH). If that is impossible
    (nginx won't retry inside a pod list that changed mid-request, which a crash causes), GET/HEAD get one
    more try through the ClusterIP service. If nothing can answer, clients get a JSON 503 with
    `Retry-After`, and React Query retries reads.
  - tested on Docker Desktop: with 3 pods per service, 2 force-deleted pods + 2 SIGKILLed containers
    during load gave 0 failed requests out of 4,133. With `minReplicas: 1`, crashing the only pod is a
    short outage (JSON 503s) until its replacement is ready; set `minReplicas: 2` if that matters.
  - unexpected errors (`uncaughtException`/`unhandledRejection`) are logged as `fatal` and the process exits;
    Kubernetes restarts it. A failed startup (Mongo unreachable) exits the same way (CrashLoopBackOff).
  - `SIGTERM` (deploy, scale-down): `preStop` waits 6 s so DNS and endpoints forget the pod, then the
    server stops accepting, finishes in-flight requests (max 20 s), and closes Mongo/Redis.
  - probes: `/healthz` (liveness: process alive), `/readyz` (readiness: Mongo connected, not draining).
    A Mongo outage marks pods unready instead of restarting them.
  - Redis down: the doctor cache falls back to Mongo; sessions/idempotency return errors fast instead of hanging.
- **Logging**: every component writes JSON lines to stdout/stderr (`kubectl logs`, or any collector).
  nginx generates an `X-Request-ID`, passes it to the service (and on to identity), and returns it to the
  client, so `reqId` ties a request's lines together across gateway → appointments → identity.
  Service lines carry `service`, `pod`, `reqId`, `method`, `path`, `status`, `ms`, `userId`; errors carry
  `err` with the stack. `LOG_LEVEL=debug|info|warn|error` (default info). Probes and static files aren't logged.

## API

| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/signup`, `/login`, `/refresh`, `/logout` | public |
| GET | `/api/doctors`, `/api/doctors/:id` | any |
| POST / DELETE | `/api/doctors`, `/api/doctors/:id` | admin |
| GET | `/api/patients` | admin |
| GET | `/api/appointments`, `/api/prescriptions` | any (scoped to own unless admin) |
| POST | `/api/appointments` | patient |
| PATCH | `/api/appointments/:id/cancel` | patient, doctor |
| POST | `/api/appointments/:id/prescription` | doctor |
