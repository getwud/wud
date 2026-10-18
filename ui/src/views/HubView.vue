<template>
  <v-container fluid class="pa-4">
    <!-- Top Toolbar with Title, Status Chip & Refresh -->
    <v-card class="border mb-4" elevation="0" rounded="lg">
      <v-toolbar color="surface" density="compact" class="px-3 py-1">
        <v-icon icon="mdi-cloud-outline" class="mr-2 text-primary" size="24"></v-icon>
        <div class="d-flex align-center flex-wrap ga-2">
          <span class="text-subtitle-1 font-weight-bold mr-1">WUD Hub</span>
          <template v-if="!initialLoading">
            <v-chip
              v-if="statusData.status === 'connected'"
              size="small"
              color="success"
              variant="flat"
              class="font-weight-bold"
            >
              Connected
            </v-chip>
            <v-chip
              v-else-if="statusData.status === 'degraded'"
              size="small"
              color="warning"
              variant="flat"
              class="font-weight-bold"
            >
              Degraded
            </v-chip>
            <v-chip
              v-else-if="statusData.status === 'error'"
              size="small"
              color="error"
              variant="flat"
              class="font-weight-bold"
            >
              Error
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
              class="text-caption text-medium-emphasis"
            >
              {{ statusData.remote.organization.name }}
            </span>

            <span
              v-if="statusData.lastCheck && statusData.status !== 'standalone'"
              class="text-caption text-medium-emphasis d-flex align-center ml-1"
            >
              <v-icon icon="mdi-clock-outline" size="14" class="mr-1"></v-icon>
              Last synced: {{ formattedLastCheck }}
            </span>
          </template>
        </div>

        <v-spacer></v-spacer>

        <v-tooltip text="Sync status &amp; quotas" location="bottom">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon="mdi-cloud-sync-outline"
              variant="text"
              size="small"
              @click="refreshStatus"
              :loading="loading"
              aria-label="Sync status &amp; quotas"
            ></v-btn>
          </template>
        </v-tooltip>
      </v-toolbar>
    </v-card>

    <!-- Initial Loading Spinner -->
    <div v-if="initialLoading" class="d-flex justify-center align-center py-16">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <template v-else>
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
          Invalid or Revoked API Key
        </div>
        <div class="text-body-2 mb-2">
          Your WUD Hub API key could not be validated (HTTP 401/403). Please verify or renew your API key in your WUD container environment variables (<code>WUD_HUB_API_KEY</code>).
        </div>
        <div v-if="statusData.errorMessage" class="text-caption text-medium-emphasis mb-3">
          Error details: {{ statusData.errorMessage }}
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
            Retry Connection
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            size="small"
            prepend-icon="mdi-key-outline"
            href="https://hub.getwud.app"
            target="_blank"
          >
            Get a new key
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
          WUD Hub connection degraded
        </div>
        <div class="text-body-2">
          {{ statusData.errorMessage || "Hub quota reached or network latency. Local fallback mode active." }}
        </div>
      </v-alert>

      <!-- Mode Connecté -->
      <template v-if="statusData.status === 'connected' || (statusData.status === 'degraded' && statusData.remote)">
        <v-row>
          <!-- Carte 1: Cloud Connection & API Key -->
          <v-col cols="12" md="6" class="d-flex flex-column">
            <v-card class="border fill-height d-flex flex-column" elevation="0" rounded="lg">
              <v-toolbar color="surface" density="compact" class="px-3 py-1 border-b">
                <v-icon icon="mdi-cloud-key-outline" class="mr-2 text-primary" size="22"></v-icon>
                <span class="text-subtitle-2 font-weight-bold">Cloud Connection &amp; API Key</span>
              </v-toolbar>

              <v-card-text class="pa-4 flex-grow-1">
                <div v-if="statusData.remote?.organization" class="mb-3">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">Organization</div>
                  <div class="text-body-1 font-weight-bold">{{ statusData.remote.organization.name }}</div>
                  <div class="text-caption text-medium-emphasis">ID: {{ statusData.remote.organization.slug || statusData.remote.organization.id }}</div>
                </div>

                <div class="mb-3">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase mb-1">API Key</div>
                  <div class="d-flex align-center justify-space-between pa-2 border rounded font-mono text-body-2">
                    <span>{{ apiKeyPreview }}</span>
                    <v-btn
                      icon="mdi-content-copy"
                      variant="text"
                      size="small"
                      @click="copyApiKey"
                      title="Copy preview"
                    ></v-btn>
                  </div>
                </div>

                <div class="mb-3">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">WUD Hub Endpoint</div>
                  <div class="text-body-2 font-mono">{{ statusData.endpoint || 'https://hub.getwud.app' }}</div>
                </div>

                <div v-if="statusData.lastCheck">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">Last check</div>
                  <div class="text-body-2">{{ formattedLastCheck }}</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Carte 2: Quota & Monitored Fleet -->
          <v-col cols="12" md="6" class="d-flex flex-column">
            <v-card class="border fill-height d-flex flex-column" elevation="0" rounded="lg">
              <v-toolbar color="surface" density="compact" class="px-3 py-1 border-b">
                <v-icon icon="mdi-server-network" class="mr-2 text-primary" size="22"></v-icon>
                <span class="text-subtitle-2 font-weight-bold">Quota &amp; Monitored Fleet</span>
              </v-toolbar>

              <v-card-text class="pa-4 flex-grow-1">
                <div class="mb-4">
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase mb-1">Active Plan</div>
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
                      Free Trial ({{ trialDaysRemaining }} days remaining)
                    </v-chip>
                  </div>
                </div>

                <div class="mb-2">
                  <div class="d-flex justify-space-between text-body-2 font-weight-medium mb-1">
                    <span>Monitored Containers</span>
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
                    {{ monitoredContainers }} container{{ monitoredContainers > 1 ? 's' : '' }} monitored out of {{ quotaLimit }} allowed.
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
                  Manage Subscription
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
          <h2 class="text-h5 font-weight-black mb-2">Supercharge your Docker fleet with WUD Hub</h2>
          <p class="text-body-1 text-medium-emphasis mb-4 mx-auto" style="max-width: 620px;">
            Monitor your Docker fleet with WUD Cloud intelligence, eliminating manual tag configurations.
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
            Start 14-day Free Trial (No Credit Card required)
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
                <div class="text-subtitle-1 font-weight-bold">Automagic Tag Rules</div>
              </div>
              <div class="text-body-2 text-medium-emphasis flex-grow-1">
                No more manual regexes. Semver strategies, support branches, and recommended patterns are automatically discovered for each image.
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" md="4" class="d-flex flex-column">
            <v-card class="border fill-height pa-4 d-flex flex-column" elevation="0" rounded="lg">
              <div class="d-flex align-center mb-2">
                <v-avatar size="40" color="secondary" variant="tonal" class="mr-3">
                  <v-icon size="22" color="secondary">mdi-creation-outline</v-icon>
                </v-avatar>
                <div class="text-subtitle-1 font-weight-bold">Changelog Intelligence</div>
              </div>
              <div class="text-body-2 text-medium-emphasis flex-grow-1">
                Intelligent release notes summary and immediate breaking changes alerts before updating.
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" md="4" class="d-flex flex-column">
            <v-card class="border fill-height pa-4 d-flex flex-column" elevation="0" rounded="lg">
              <div class="d-flex align-center mb-2">
                <v-avatar size="40" color="success" variant="tonal" class="mr-3">
                  <v-icon size="22" color="success">mdi-shield-check-outline</v-icon>
                </v-avatar>
                <div class="text-subtitle-1 font-weight-bold">CVE &amp; SBOM Detection</div>
              </div>
              <div class="text-body-2 text-medium-emphasis flex-grow-1">
                Continuous vulnerability audit of production containers and immediate alerts on critical security flaws.
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Bloc d'aide rapide -->
        <v-card class="border pa-4" elevation="0" rounded="lg">
          <div class="d-flex align-center mb-2">
            <v-icon icon="mdi-help-circle-outline" class="mr-2 text-primary" size="22"></v-icon>
            <span class="text-subtitle-1 font-weight-bold">How to configure WUD_HUB_API_KEY?</span>
          </div>
          <div class="text-body-2 text-medium-emphasis mb-3">
            1. Retrieve your API key at <a href="https://hub.getwud.app" target="_blank" class="text-primary font-weight-bold">hub.getwud.app</a>.<br>
            2. Add the <code>WUD_HUB_API_KEY</code> environment variable to your <code>docker-compose.yml</code>:
          </div>
          <div class="code-container pa-3 rounded border mb-3 position-relative font-mono text-caption">
            <v-btn
              icon="mdi-content-copy"
              size="x-small"
              variant="text"
              class="position-absolute"
              style="top: 8px; right: 8px;"
              @click="copySnippet"
              title="Copy snippet"
            ></v-btn>
            <pre class="ma-0">services:
  wud:
    image: getwud/wud
    environment:
      - WUD_HUB_API_KEY=wud_xxxxxxxxxxxxxxxxxxxx</pre>
          </div>
          <div class="text-caption text-medium-emphasis">
            Then restart the service with <code>docker compose up -d</code>.
          </div>
        </v-card>
      </template>
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

const initialLoading = ref(true);
const loading = ref(false);
const isTesting = ref(false);

async function loadStatus(refresh = false) {
  loading.value = true;
  try {
    statusData.value = await getHubStatus({ refresh });
  } catch (err: any) {
    statusData.value.status = "error";
    statusData.value.errorMessage = err?.message || "Failed to load Hub status";
  } finally {
    loading.value = false;
    initialLoading.value = false;
  }
}

async function refreshStatus() {
  await loadStatus(true);
  eventBus.emit("notify", "Hub status refreshed");
}

async function testConnection() {
  isTesting.value = true;
  try {
    statusData.value = await getHubStatus({ refresh: true });
    if (statusData.value.status === "connected") {
      eventBus.emit("notify", "Connected to WUD Hub successfully");
    } else if (statusData.value.status === "error") {
      eventBus.emit("notify", "Failed to connect to WUD Hub", "error");
    } else {
      eventBus.emit("notify", `Status: ${statusData.value.status}`, "warning");
    }
  } catch (err: any) {
    eventBus.emit("notify", `Error: ${err.message}`, "error");
  } finally {
    isTesting.value = false;
  }
}

const apiKeyPreview = computed(() => {
  return statusData.value.remote?.apiKey?.preview || (statusData.value.hasKey ? "wud_••••••••" : "Not configured");
});

const formattedLastCheck = computed(() => {
  if (!statusData.value.lastCheck) return "Never";
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
      return "Free";
    default:
      return tier || "Active Plan";
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
    eventBus.emit("notify", "API key copied to clipboard");
  } else {
    eventBus.emit("notify", "Failed to copy API key", "warning");
  }
}

async function copySnippet() {
  const snippet = `services:
  wud:
    image: getwud/wud
    environment:
      - WUD_HUB_API_KEY=wud_xxxxxxxxxxxxxxxxxxxx`;
  const copied = await copyToClipboard(snippet);
  if (copied) {
    eventBus.emit("notify", "Snippet copied to clipboard");
  } else {
    eventBus.emit("notify", "Failed to copy snippet", "warning");
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
