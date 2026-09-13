#!/bin/bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.nomad-e2e.yml"

echo "🧪 [Nomad E2E] Initialisation de l'environnement de test Nomad..."

cleanup() {
    STATUS=$?
    if [ $STATUS -ne 0 ]; then
        echo "❌ [Nomad E2E] Échec détecté, affichage des logs de WUD..."
        docker logs wud-nomad || true
        echo "❌ [Nomad E2E] Logs de Nomad..."
        docker logs nomad-server || true
    fi
    echo "🧹 [Nomad E2E] Nettoyage des conteneurs WUD et Nomad..."
    docker compose -f "$COMPOSE_FILE" down -v || true
    exit $STATUS
}
trap cleanup EXIT INT TERM

# 1. Démarrer le serveur Nomad
echo "🚀 [Nomad E2E] Démarrage du serveur Nomad..."
docker compose -f "$COMPOSE_FILE" up -d nomad

# 2. Attendre que Nomad soit prêt
echo "⏳ [Nomad E2E] Attente de la disponibilité de l'API Nomad..."
MAX_WAIT_SECONDS=30
START_TIME=$(date +%s)
while true; do
    if curl -s -f http://localhost:4646/v1/status/leader | grep -q ":4647"; then
        echo "🎯 [Nomad E2E] Le serveur Nomad est prêt !"
        break
    fi
    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [ $ELAPSED -ge $MAX_WAIT_SECONDS ]; then
        echo "⚠️ [Nomad E2E] Timeout en attente du serveur Nomad."
        docker logs nomad-server
        exit 1
    fi
    sleep 1
done

# 3. Enregistrer les fixtures de test dans Nomad
echo "📦 [Nomad E2E] Déploiement des jobs Nomad de test..."
for job_file in "$SCRIPT_DIR/../e2e/fixtures/nomad/"*.nomad.hcl; do
    echo "  -> Enregistrement de $(basename "$job_file")..."
    docker exec -i nomad-server nomad job run -detach - < "$job_file"
done

# 4. Démarrer WUD connecté au réseau Nomad
echo "🚀 [Nomad E2E] Démarrage de WUD..."
docker compose -f "$COMPOSE_FILE" up -d --build wud

# 5. Attendre le scan initial
echo "⏳ [Nomad E2E] Attente de la résolution initiale des conteneurs WUD..."
MAX_WAIT_SECONDS=60
START_TIME=$(date +%s)
while true; do
    if docker logs wud-nomad 2>&1 | grep -E "Cron finished \([1-9][0-9]* containers watched"; then
        ELAPSED=$(( $(date +%s) - START_TIME ))
        echo "🎯 [Nomad E2E] WUD est prêt ! Scan terminé en ${ELAPSED}s."
        break
    fi
    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [ $ELAPSED -ge $MAX_WAIT_SECONDS ]; then
        echo "⚠️ [Nomad E2E] Timeout en attente de 'Cron finished'. Logs récents :"
        docker logs --tail 50 wud-nomad
        break
    fi
    sleep 1
done

# 6. Exécuter les scénarios Cucumber Nomad
echo "🏃 [Nomad E2E] Exécution des tests Cucumber Nomad..."
(cd "$SCRIPT_DIR/../e2e" && npm run cucumber:nomad)

echo "✅ [Nomad E2E] Tests E2E Nomad terminés avec succès !"
