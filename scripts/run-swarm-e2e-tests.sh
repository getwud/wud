#!/bin/bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.swarm-e2e.yml"

echo "🧪 [Swarm E2E] Initialisation de l'environnement de test Docker Swarm (DinD)..."

cleanup() {
    STATUS=$?
    if [ $STATUS -ne 0 ]; then
        echo "❌ [Swarm E2E] Échec détecté, affichage des logs de WUD..."
        docker logs wud-swarm || true
        echo "❌ [Swarm E2E] Logs de DinD Swarm..."
        docker logs dind-swarm || true
    fi
    echo "🧹 [Swarm E2E] Nettoyage des conteneurs WUD et DinD..."
    docker compose -f "$COMPOSE_FILE" down -v || true
    exit $STATUS
}
trap cleanup EXIT INT TERM

# 1. Démarrer le conteneur DinD
echo "🚀 [Swarm E2E] Démarrage du daemon Docker Swarm (DinD)..."
docker compose -f "$COMPOSE_FILE" up -d dind

# 2. Attendre que le daemon Docker soit prêt
echo "⏳ [Swarm E2E] Attente de la disponibilité du daemon Docker DinD..."
MAX_WAIT_SECONDS=30
START_TIME=$(date +%s)
while true; do
    if docker exec dind-swarm docker info >/dev/null 2>&1; then
        echo "🎯 [Swarm E2E] Le daemon Docker DinD est prêt !"
        break
    fi
    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [ $ELAPSED -ge $MAX_WAIT_SECONDS ]; then
        echo "⚠️ [Swarm E2E] Timeout en attente du daemon Docker DinD."
        docker logs dind-swarm
        exit 1
    fi
    sleep 1
done

# 3. Initialiser le cluster Swarm
echo "🐝 [Swarm E2E] Initialisation du cluster Docker Swarm..."
docker exec dind-swarm docker swarm init --advertise-addr 127.0.0.1

# 4. Déployer les stacks Swarm de test
echo "📦 [Swarm E2E] Déploiement des stacks Swarm de test..."
docker exec -i dind-swarm docker stack deploy -c - swarm-demo < "$SCRIPT_DIR/../e2e/fixtures/swarm/stack-web.yml"
docker exec -i dind-swarm docker stack deploy -c - swarm-ignored < "$SCRIPT_DIR/../e2e/fixtures/swarm/stack-ignored.yml"

# Attendre que les services soient bien créés
echo "⏳ [Swarm E2E] Vérification des services Swarm créés..."
docker exec dind-swarm docker service ls

# 5. Démarrer WUD connecté au daemon DinD
echo "🚀 [Swarm E2E] Démarrage de WUD..."
docker compose -f "$COMPOSE_FILE" up -d --build wud

# 6. Attendre le scan initial
echo "⏳ [Swarm E2E] Attente de la résolution initiale des conteneurs WUD..."
MAX_WAIT_SECONDS=60
START_TIME=$(date +%s)
while true; do
    if docker logs wud-swarm 2>&1 | grep -E "Cron finished \([1-9][0-9]* containers watched"; then
        ELAPSED=$(( $(date +%s) - START_TIME ))
        echo "🎯 [Swarm E2E] WUD est prêt ! Scan terminé en ${ELAPSED}s."
        break
    fi
    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [ $ELAPSED -ge $MAX_WAIT_SECONDS ]; then
        echo "⚠️ [Swarm E2E] Timeout en attente de 'Cron finished'. Logs récents :"
        docker logs --tail 50 wud-swarm
        break
    fi
    sleep 1
done

# 7. Exécuter les scénarios Cucumber Swarm
echo "🏃 [Swarm E2E] Exécution des tests Cucumber Swarm..."
(cd "$SCRIPT_DIR/../e2e" && npm run cucumber:swarm)

echo "✅ [Swarm E2E] Tests E2E Swarm terminés avec succès !"
