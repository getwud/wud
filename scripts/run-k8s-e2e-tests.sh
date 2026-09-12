#!/bin/bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CLUSTER_NAME="wud-test"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.k8s-e2e.yml"

echo "🧪 [K8s E2E] Initialisation de l'environnement de test Kubernetes..."

cleanup() {
    STATUS=$?
    echo "🧹 [K8s E2E] Nettoyage des conteneurs WUD..."
    docker compose -f "$COMPOSE_FILE" down -v || true
    if [ "$KEEP_CLUSTER" != "true" ]; then
        echo "🧹 [K8s E2E] Suppression du cluster kind $CLUSTER_NAME..."
        kind delete cluster --name "$CLUSTER_NAME" || true
    fi
    rm -f /tmp/kubeconfig-internal.yaml
    exit $STATUS
}
trap cleanup EXIT INT TERM

# 1. Vérifier ou démarrer Kind
if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo "🚀 [K8s E2E] Création du cluster kind '$CLUSTER_NAME'..."
    kind create cluster --name "$CLUSTER_NAME" --wait 60s
else
    echo "ℹ️ [K8s E2E] Cluster kind '$CLUSTER_NAME' déjà actif."
fi

# 2. Exporter le kubeconfig interne pour la communication conteneur-à-conteneur
echo "🔑 [K8s E2E] Export du kubeconfig interne..."
kind get kubeconfig --internal --name "$CLUSTER_NAME" > /tmp/kubeconfig-internal.yaml
chmod 644 /tmp/kubeconfig-internal.yaml

# 3. Déployer les fixtures
echo "📦 [K8s E2E] Déploiement des manifests K8s..."
kubectl apply -f "$SCRIPT_DIR/../e2e/fixtures/kubernetes/"

echo "⏳ [K8s E2E] Attente de la disponibilité des pods..."
kubectl rollout status deployment/test-deployment --timeout=60s
kubectl rollout status statefulset/test-statefulset --timeout=60s
kubectl rollout status daemonset/test-daemonset --timeout=60s

# 4. Démarrer WUD via Compose
echo "🚀 [K8s E2E] Démarrage de WUD connecté au réseau kind..."
docker compose -f "$COMPOSE_FILE" up -d --build

# 5. Attendre le scan initial
echo "⏳ [K8s E2E] Attente de la résolution initiale des conteneurs WUD..."
MAX_WAIT_SECONDS=60
START_TIME=$(date +%s)
while true; do
    if docker logs wud-k8s 2>&1 | grep -q "Cron finished"; then
        ELAPSED=$(( $(date +%s) - START_TIME ))
        echo "🎯 [K8s E2E] WUD est prêt ! Scan terminé en ${ELAPSED}s."
        break
    fi
    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [ $ELAPSED -ge $MAX_WAIT_SECONDS ]; then
        echo "⚠️ [K8s E2E] Timeout en attente de 'Cron finished'. Logs récents :"
        docker logs --tail 30 wud-k8s
        break
    fi
    sleep 1
done

# 6. Exécuter les scénarios Cucumber Kubernetes
echo "🏃 [K8s E2E] Exécution des tests Cucumber Kubernetes..."
(cd "$SCRIPT_DIR/../e2e" && npm run cucumber:kubernetes)

echo "✅ [K8s E2E] Tests E2E Kubernetes terminés avec succès !"
