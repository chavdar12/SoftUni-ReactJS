# Gateway image: builds the React SPA, then serves it from nginx, which also
# routes /api to the identity and appointments services (see default.conf.template).
# Build context is the repo root so it can reach both client/ and nginx/.

FROM node:24-alpine AS client
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM nginx:1.29-alpine-otel
# Load the OpenTelemetry module (bundled in the -otel image) so the gateway starts each trace.
RUN sed -i '1i load_module modules/ngx_otel_module.so;' /etc/nginx/nginx.conf
# RESOLVER, IDENTITY_HOST, APPOINTMENTS_HOST, OTEL_ENDPOINT come from k8s/gateway.yaml.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=client /app/dist /usr/share/nginx/html
