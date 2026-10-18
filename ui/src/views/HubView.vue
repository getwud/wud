<template>
  <v-container fluid class="pa-4">
    <!-- Top Toolbar with Title, Status Chip & Refresh -->
    <v-card class="border mb-4" elevation="0" rounded="lg">
      <v-toolbar color="surface" density="compact" class="px-3 py-1">
        <v-icon icon="mdi-cloud-outline" class="mr-2 text-primary" size="24"></v-icon>
        <div class="d-flex align-center">
          <span class="text-subtitle-1 font-weight-bold mr-2">WUD Hub</span>
          <v-chip
            v-if="statusData.status === 'connected'"
            size="small"
            color="success"
            variant="flat"
            class="font-weight-bold"
          >
            Connecté
          </v-chip>
          <v-chip
            v-else-if="statusData.status === 'degraded'"
            size="small"
            color="warning"
            variant="flat"
            class="font-weight-bold"
          >
            Dégradé
          </v-chip>
          <v-chip
            v-else-if="statusData.status === 'error'"
            size="small"
            color="error"
            variant="flat"
            class="font-weight-bold"
          >
            Erreur
          </v-chip>
          <v-chip
            v-else
            size="small"
            color="secondary"
            variant="tonal"
            class="font-weight-bold"
          >
            Standalone
          </v-chip>

          <span
            v-if="statusData.remote?.organization?.name"
            class="text-caption text-medium-emphasis ml-2"
          >
            {{ statusData.remote.organization.name }}
          </span>
        </div>

        <v-spacer></v-spacer>

        <v-btn
          icon="mdi-refresh"
          variant="text"
          size="small"
          @click="refreshStatus"
          :loading="loading"
          title="Actualiser le statut"
        ></v-btn>
      </v-toolbar>
    </v-card>

    <!-- Error Banner -->
    <v-alert
      v-if="statusData.status === 'error'"
      type="error"
      variant="tonal"
      class="mb-4"
      icon="mdi-alert-circle-outline"
      rounded="lg"
    >
      <div class="text-subtitle-1 font-weight-bold mb-1">
        Clé API invalide ou révoquée
      </div>
      <div class="text-body-2 mb-2">
        Votre clé API WUD Hub n'a pas pu être validée (HTTP 401/403). Veuillez vérifier ou renouveler votre clé API dans les variables d'environnement de votre conteneur WUD (<code>WUD_HUB_API_KEY</code>).
      </div>
      <div v-if="statusData.errorMessage" class="text-caption text-medium-emphasis mb-3">
        Détail de l'erreur : {{ statusData.errorMessage }}
      </div>
      <div class="d-flex align-center ga-2 flex-wrap">
        <v-btn
          color="error"
          variant="flat"
          size="small"
          prepend-icon="mdi-refresh"
          :loading="isTesting"
          @click="testConnection"
        >
          Tester la connexion
        </v-btn>
        <v-btn
          color="error"
          variant="outlined"
          size="small"
          prepend-icon="mdi-key-outline"
          href="https://hub.getwud.app"
          target="_blank"
        >
          Obtenir une nouvelle clé
        </v-btn>
      </div>
    </v-alert>

    <!-- Degraded Banner -->
    <v-alert
      v-if="statusData.status === 'degraded'"
      type="warning"
      variant="tonal"
      class="mb-4"
      icon="mdi-alert-outline"
      rounded="lg"
    >
      <div class="text-subtitle-1 font-weight-bold mb-1">
        Connexion WUD Hub dégradée
      </div>
      <div class="text-body-2">
        {{ statusData.errorMessage || "Quota Hub atteint ou réseau ralenti. Mode fallback local actif." }}
      </div>
    </v-alert>

    <!-- Mode Connecté -->
    <template v-if="statusData.status === 'connected' || (statusData.status === 'degraded' && statusData.remote)">
      <v-row>
        <!-- Carte 1: Liaison Cloud & Clé d'API -->
        <v-col cols="12" md="6" class="d-flex flex-column">
          <v-card class="border fill-height d-flex flex-column" elevation="0" rounded="lg">
            <v-toolbar color="surface" density="compact" class="px-3 py-1 border-b">
              <v-icon icon="mdi-cloud-key-outline" class="mr-2 text-primary" size="22"></v-icon>
              <span class="text-subtitle-2 font-weight-bold">Liaison Cloud &amp; Clé d'API</span>
            </v-toolbar>

            <v-card-text class="pa-4 flex-grow-1">
              <div v-if="statusData.remote?.organization" class="mb-3">
                <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">Organisation</div>
                <div class="text-body-1 font-weight-bold">{{ statusData.remote.organization.name }}</div>
                <div class="text-caption text-medium-emphasis">ID: {{ statusData.remote.organization.slug || statusData.remote.organization.id }}</div>
              </div>

              <div class="mb-3">
                <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase mb-1">Clé d'API</div>
                <div class="d-flex align-center justify-space-between pa-2 border rounded font-mono text-body-2">
                  <span>{{ apiKeyPreview }}</span>
                  <v-btn
                    icon="mdi-content-copy"
                    variant="text"
                    size="small"
                    @click="copyApiKey"
                    title="Copier la prévisualisation"
                  ></v-btn>
                </div>
              </div>

              <div class="mb-3">
                <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">Endpoint WUD Hub</div>
                <div class="text-body-2 font-mono">{{ statusData.endpoint || 'https://hub.getwud.app' }}</div>
              </div>

              <div v-if="statusData.lastCheck">
                <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">Dernière vérification</div>
                <div class="text-body-2">{{ formattedLastCheck }}</div>
              </div>
            </v-card-text>

            <v-card-actions class="pa-3 border-t">
              <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="mdi-refresh"
                :loading="isTesting"
                @click="testConnection"
              >
                Tester la connexion
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- Carte 2: Quota & Flotte Supervisée -->
        <v-col cols="12" md="6" class="d-flex flex-column">
          <v-card class="border fill-height d-flex flex-column" elevation="0" rounded="lg">
            <v-toolbar color="surface" density="compact" class="px-3 py-1 border-b">
              <v-icon icon="mdi-server-network" class="mr-2 text-primary" size="22"></v-icon>
              <span class="text-subtitle-2 font-weight-bold">Quota &amp; Flotte Supervisée</span>
            </v-toolbar>

            <v-card-text class="pa-4 flex-grow-1">
              <div class="mb-4">
                <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase mb-1">Formule active</div>
                <div class="d-flex align-center flex-wrap ga-2">
                  <v-chip :color="planBadgeColor" size="small" variant="flat" class="font-weight-bold">
                    {{ planLabel }}
                  </v-chip>
                  <v-chip
                    v-if="trialDaysRemaining !== null"
                    color="purple"
                    size="small"
                    variant="tonal"
                    class="font-weight-bold"
                  >
                    Essai gratuit ({{ trialDaysRemaining }} j restants)
                  </v-chip>
                </div>
              </div>

              <div class="mb-2">
                <div class="d-flex justify-space-between text-body-2 font-weight-medium mb-1">
                  <span>Conteneurs surveillés</span>
                  <span class="font-weight-bold">{{ monitoredContainers }} / {{ quotaLimit }}</span>
                </div>
                <v-progress-linear
                  :model-value="quotaPercentage"
                  :color="quotaColor"
                  height="10"
                  rounded
                  class="mb-2"
                ></v-progress-linear>
                <div class="text-caption text-medium-emphasis">
                  {{ monitoredContainers }} conteneur{{ monitoredContainers > 1 ? 's' : '' }} supervisé{{ monitoredContainers > 1 ? 's' : '' }} sur une limite de {{ quotaLimit }}.
                </div>
              </div>
            </v-card-text>

            <v-card-actions class="pa-3 border-t">
              <v-btn
                color="primary"
                variant="flat"
                prepend-icon="mdi-credit-card-outline"
                :href="portalUrl"
                target="_blank"
              >
                Gérer mon abonnement
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Mode Non Connecté / Standalone -->
    <template v-else-if="statusData.status === 'standalone' || (statusData.status === 'error' && !statusData.remote)">
      <!-- Vitrine & Onboarding -->
      <v-card class="border mb-4 pa-6 text-center showcase-card" elevation="0" rounded="lg">
        <v-avatar size="64" color="primary" variant="tonal" class="mb-3">
          <v-icon size="36" color="primary">mdi-cloud-outline</v-icon>
        </v-avatar>
        <h2 class="text-h5 font-weight-black mb-2">Passez à la vitesse supérieure avec WUD Hub</h2>
        <p class="text-body-1 text-medium-emphasis mb-4 mx-auto" style="max-width: 620px;">
          Supervisez votre flotte Docker avec l'intelligence du Cloud WUD, sans configuration manuelle fastidieuse.
        </p>
        <v-btn
          color="primary"
          size="large"
          variant="flat"
          prepend-icon="mdi-rocket-launch"
          href="https://hub.getwud.app"
          target="_blank"
          class="font-weight-bold px-6"
        >
          Activer mon essai gratuit 14 jours (Sans CB)
        </v-btn>
      </v-card>

      <!-- 3 Super-pouvoirs -->
      <v-row class="mb-4">
        <v-col cols="12" md="4" class="d-flex flex-column">
          <v-card class="border fill-height pa-4 d-flex flex-column" elevation="0" rounded="lg">
            <div class="d-flex align-center mb-2">
              <v-avatar size="40" color="primary" variant="tonal" class="mr-3">
                <v-icon size="22" color="primary">mdi-tag-check-outline</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold">Règles automatiques de tags</div>
            </div>
            <div class="text-body-2 text-medium-emphasis flex-grow-1">
              Fini les regex manuelles. Les stratégies semver, branches de support et patterns recommandés sont automatiquement découverts pour chaque image.
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="4" class="d-flex flex-column">
          <v-card class="border fill-height pa-4 d-flex flex-column" elevation="0" rounded="lg">
            <div class="d-flex align-center mb-2">
              <v-avatar size="40" color="secondary" variant="tonal" class="mr-3">
                <v-icon size="22" color="secondary">mdi-creation-outline</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold">Intelligence IA Changelogs</div>
            </div>
            <div class="text-body-2 text-medium-emphasis flex-grow-1">
              Synthèse intelligente des notes de version et alertes immédiates sur les breaking changes avant d'appliquer une mise à jour.
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="4" class="d-flex flex-column">
          <v-card class="border fill-height pa-4 d-flex flex-column" elevation="0" rounded="lg">
            <div class="d-flex align-center mb-2">
              <v-avatar size="40" color="success" variant="tonal" class="mr-3">
                <v-icon size="22" color="success">mdi-shield-check-outline</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold">Détection CVE &amp; SBOM</div>
            </div>
            <div class="text-body-2 text-medium-emphasis flex-grow-1">
              Audit continu des vulnérabilités de vos conteneurs en production et alertes en cas de failles de sécurité critiques.
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Bloc d'aide rapide -->
      <v-card class="border pa-4" elevation="0" rounded="lg">
        <div class="d-flex align-center mb-2">
          <v-icon icon="mdi-help-circle-outline" class="mr-2 text-primary" size="22"></v-icon>
          <span class="text-subtitle-1 font-weight-bold">Comment ajouter WUD_HUB_API_KEY ?</span>
        </div>
        <div class="text-body-2 text-medium-emphasis mb-3">
          1. Récupérez votre clé d'API sur <a href="https://hub.getwud.app" target="_blank" class="text-primary font-weight-bold">hub.getwud.app</a>.<br>
          2. Ajoutez la variable d'environnement <code>WUD_HUB_API_KEY</code> dans votre <code>docker-compose.yml</code> :
        </div>
        <div class="code-container pa-3 rounded border mb-3 position-relative font-mono text-caption">
          <v-btn
            icon="mdi-content-copy"
            size="x-small"
            variant="text"
            class="position-absolute"
            style="top: 8px; right: 8px;"
            @click="copySnippet"
            title="Copier le snippet"
          ></v-btn>
          <pre class="ma-0">services:
  wud:
    image: fmartinou/whats-up-docker
    environment:
      - WUD_HUB_API_KEY=wud_live_xxxxxxxxxxxxxxxx</pre>
        </div>
        <div class="text-caption text-medium-emphasis">
          Redémarrez ensuite le service avec <code>docker compose up -d</code>.
        </div>
      </v-card>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { getHubStatus, HubStatus } from "@/services/hub";
import { copyToClipboard } from "@/services/clipboard";
import { useEventBus } from "@/composables/useEventBus";

const eventBus = useEventBus();

const statusData = ref<HubStatus>({
  enabled: false,
  status: "standalone",
  endpoint: "",
  hasKey: false,
});

const loading = ref(false);
const isTesting = ref(false);

async function loadStatus(refresh = false) {
  loading.value = true;
  try {
    statusData.value = await getHubStatus({ refresh });
  } catch (err: any) {
    statusData.value.status = "error";
    statusData.value.errorMessage = err?.message || "Erreur lors du chargement du statut";
  } finally {
    loading.value = false;
  }
}

async function refreshStatus() {
  await loadStatus(true);
  eventBus.emit("notify", "Statut Hub actualisé");
}

async function testConnection() {
  isTesting.value = true;
  try {
    statusData.value = await getHubStatus({ refresh: true });
    if (statusData.value.status === "connected") {
      eventBus.emit("notify", "Connexion au WUD Hub réussie");
    } else if (statusData.value.status === "error") {
      eventBus.emit("notify", "Échec de connexion au WUD Hub", "error");
    } else {
      eventBus.emit("notify", `Statut : ${statusData.value.status}`, "warning");
    }
  } catch (err: any) {
    eventBus.emit("notify", `Erreur : ${err.message}`, "error");
  } finally {
    isTesting.value = false;
  }
}

const apiKeyPreview = computed(() => {
  return statusData.value.remote?.apiKey?.preview || (statusData.value.hasKey ? "wud_••••••••" : "Non configurée");
});

const formattedLastCheck = computed(() => {
  if (!statusData.value.lastCheck) return "Jamais";
  try {
    const d = new Date(statusData.value.lastCheck);
    return d.toLocaleString();
  } catch {
    return statusData.value.lastCheck;
  }
});

const planLabel = computed(() => {
  const tier = statusData.value.remote?.subscription?.planTier;
  switch (tier) {
    case "smart_updates":
      return "Smart Updates";
    case "secops_pro":
      return "SecOps Pro";
    case "business_fleet":
      return "Business Fleet";
    case "free":
      return "Gratuit";
    default:
      return tier || "Plan Actif";
  }
});

const planBadgeColor = computed(() => {
  const tier = statusData.value.remote?.subscription?.planTier;
  switch (tier) {
    case "smart_updates":
      return "primary";
    case "secops_pro":
      return "deep-purple";
    case "business_fleet":
      return "indigo";
    default:
      return "info";
  }
});

const trialDaysRemaining = computed(() => {
  return statusData.value.remote?.subscription?.trialDaysRemaining ?? null;
});

const monitoredContainers = computed(() => {
  return statusData.value.remote?.quota?.monitoredContainers ?? 0;
});

const quotaLimit = computed(() => {
  return statusData.value.remote?.quota?.limit ?? 10;
});

const quotaPercentage = computed(() => {
  if (!quotaLimit.value) return 0;
  return Math.min(100, Math.round((monitoredContainers.value / quotaLimit.value) * 100));
});

const quotaColor = computed(() => {
  if (quotaPercentage.value >= 80) {
    return "warning";
  }
  return "success";
});

const portalUrl = computed(() => {
  return statusData.value.remote?.subscription?.portalUrl || "https://hub.getwud.app";
});

async function copyApiKey() {
  const text = apiKeyPreview.value;
  const copied = await copyToClipboard(text);
  if (copied) {
    eventBus.emit("notify", "Clé d'API copiée dans le presse-papiers");
  } else {
    eventBus.emit("notify", "Impossible de copier la clé d'API", "warning");
  }
}

async function copySnippet() {
  const snippet = `services:
  wud:
    image: fmartinou/whats-up-docker
    environment:
      - WUD_HUB_API_KEY=wud_live_xxxxxxxxxxxxxxxx`;
  const copied = await copyToClipboard(snippet);
  if (copied) {
    eventBus.emit("notify", "Exemple docker-compose copié");
  } else {
    eventBus.emit("notify", "Impossible de copier l'exemple", "warning");
  }
}

onMounted(() => {
  loadStatus();
});
</script>

<style scoped>
.font-mono {
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.code-container {
  background-color: rgba(var(--v-theme-surface-variant), 0.15);
  overflow-x: auto;
}

.showcase-card {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05) 0%, rgba(var(--v-theme-surface), 1) 100%);
}
</style>
