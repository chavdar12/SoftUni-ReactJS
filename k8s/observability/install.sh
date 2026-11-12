#!/usr/bin/env bash
# Installs logs (Loki + Alloy), metrics (Prometheus), traces (Tempo) and Grafana into `monitoring`.
# Re-runnable: every step is an upgrade-or-install. Grafana: http://localhost:3000 (user admin).
set -euo pipefail
cd "$(dirname "$0")"

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null
helm repo add grafana https://grafana.github.io/helm-charts >/dev/null
helm repo add grafana-community https://grafana-community.github.io/helm-charts >/dev/null  # tempo's chart moved here
helm repo update >/dev/null

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
if ! kubectl -n monitoring get secret grafana-admin >/dev/null 2>&1; then
  kubectl -n monitoring create secret generic grafana-admin \
    --from-literal=admin-user=admin --from-literal=admin-password="$(openssl rand -hex 12)"
fi

helm upgrade --install kps prometheus-community/kube-prometheus-stack --version 93.2.2 -n monitoring -f kube-prometheus-stack.yaml --wait
helm upgrade --install loki grafana/loki --version 7.6.0 -n monitoring -f loki.yaml --wait
helm upgrade --install tempo grafana-community/tempo --version 3.2.1 -n monitoring -f tempo.yaml --wait
helm upgrade --install alloy grafana/alloy --version 1.15.0 -n monitoring -f alloy.yaml --wait
kubectl apply -k .

echo "Grafana: http://localhost:3000  user: admin  password: $(kubectl -n monitoring get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d)"
