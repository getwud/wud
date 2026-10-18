<template>
  <div
    class="hub-status-pill d-flex align-center px-2 py-1 rounded-pill"
    :class="statusClass"
  >
    <span class="status-dot mr-1"></span>
    <span class="text-caption font-weight-bold">
      {{ labelText }}
    </span>
    <v-tooltip activator="parent" location="bottom">
      <span>{{ tooltipText }}</span>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { getHubStatus, HubStatus } from "@/services/hub";

const statusData = ref<HubStatus>({
  enabled: false,
  status: "standalone",
  endpoint: "",
  hasKey: false,
});

let timer: ReturnType<typeof setInterval> | null = null;

async function loadStatus() {
  try {
    statusData.value = await getHubStatus();
  } catch {
    statusData.value.status = "error";
  }
}

onMounted(() => {
  loadStatus();
  timer = setInterval(loadStatus, 30000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});

const statusClass = computed(() => `status-${statusData.value.status}`);

const labelText = computed(() => {
  switch (statusData.value.status) {
    case "connected":
      return "Hub";
    case "degraded":
      return "Hub Degraded";
    case "error":
      return "Hub Error";
    default:
      return "Standalone";
  }
});

const tooltipText = computed(() => {
  switch (statusData.value.status) {
    case "connected":
      return "Connecté à WUD Hub — Découverte automatique des configurations active.";
    case "degraded":
      return (
        statusData.value.errorMessage ||
        "Quota Hub atteint ou réseau ralenti. Mode fallback actif."
      );
    case "error":
      return "Clé API Hub invalide ou refusée (401/403). Vérifiez votre variable d’environnement.";
    default:
      return "Mode Standalone WUD. Définissez WUD_HUB_API_KEY pour activer l’automagic discovery.";
  }
});
</script>

<style scoped>
.hub-status-pill {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: all 0.2s ease;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-connected .status-dot {
  background-color: #4caf50;
  box-shadow: 0 0 6px #4caf50;
}
.status-degraded .status-dot {
  background-color: #ff9800;
  box-shadow: 0 0 6px #ff9800;
}
.status-error .status-dot {
  background-color: #f44336;
  box-shadow: 0 0 6px #f44336;
}
.status-standalone .status-dot {
  background-color: #9e9e9e;
}
</style>
