<template>
  <v-container class="py-6 px-4 px-md-8" max-width="1400">
    <!-- Hero Banner (Command Center) -->
    <v-sheet
      class="hero-banner pa-6 pa-md-7 mb-8 rounded-lg bg-surface position-relative overflow-hidden border elevation-1"
    >
      <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between position-relative z-index-1">
        <div class="d-flex align-center mb-4 mb-md-0">
          <v-avatar color="primary" variant="tonal" size="52" class="mr-4 rounded-lg">
            <v-icon size="28" color="primary">mdi-view-dashboard-outline</v-icon>
          </v-avatar>
          <div>
            <h1 class="text-h5 font-weight-bold mb-1 text-high-emphasis">What's Up Docker</h1>
            <p class="text-body-2 text-medium-emphasis mb-0">
              <span v-if="containersToUpdateCount > 0" class="d-inline-flex align-center text-warning font-weight-medium">
                <v-icon size="16" class="mr-1">mdi-alert-circle</v-icon>
                {{ containersToUpdateCount }} update{{ containersToUpdateCount > 1 ? 's' : '' }} available for your containers
              </span>
              <span v-else class="d-inline-flex align-center text-success font-weight-medium">
                <v-icon size="16" class="mr-1">mdi-check-circle</v-icon>
                All your containers are currently up-to-date and running smoothly
              </span>
            </p>
          </div>
        </div>

        <div class="d-flex align-center">
          <v-btn
            v-if="containersToUpdateCount > 0"
            color="primary"
            variant="flat"
            size="default"
            prepend-icon="mdi-arrow-up-bold-circle-outline"
            to="/containers?update-available=true"
            class="font-weight-bold text-none rounded-lg"
          >
            Review Updates
          </v-btn>
          <v-chip
            v-else
            color="success"
            variant="tonal"
            size="default"
            prepend-icon="mdi-shield-check"
            class="font-weight-bold"
          >
            Infrastructure Healthy
          </v-chip>
        </div>
      </div>
    </v-sheet>

    <!-- 4 Command Center Cards -->
    <v-row class="g-4">
      <!-- 1. Containers Card -->
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="home-card pa-5 rounded-lg d-flex flex-column justify-space-between"
          elevation="2"
          hover
          to="/containers"
        >
          <div>
            <div class="d-flex align-center justify-space-between mb-3">
              <v-avatar color="primary" variant="tonal" size="52" class="rounded-lg">
                <v-icon size="28" color="primary">{{ containerIcon }}</v-icon>
              </v-avatar>
              <v-icon color="grey-lighten-1" size="20">mdi-arrow-top-right</v-icon>
            </div>
            <div class="text-h3 font-weight-bold mb-1 text-high-emphasis">
              {{ containersCount }}
            </div>
            <div class="text-caption font-weight-bold text-grey-darken-1 text-uppercase tracking-wider">
              Containers
            </div>
          </div>

          <div class="mt-4 pt-3 border-t">
            <div class="status-slot mb-2">
              <v-btn
                class="update-status text-none px-0 font-weight-medium"
                size="small"
                variant="plain"
                :color="containersToUpdateCount > 0 ? 'warning' : 'success'"
                :prepend-icon="containersToUpdateCount > 0 ? 'mdi-alert-circle' : 'mdi-check-circle'"
                to="/containers?update-available=true"
                :style="{
                  pointerEvents: containersToUpdateCount === 0 ? 'none' : 'auto',
                }"
                @click.stop
              >
                ({{ containerUpdateMessage }})
              </v-btn>
            </div>
            <v-btn
              variant="plain"
              size="small"
              color="primary"
              class="px-0 text-none font-weight-medium"
              append-icon="mdi-chevron-right"
              to="/containers"
            >
              {{ containersCount }} containers
            </v-btn>
          </div>
        </v-card>
      </v-col>

      <!-- 2. Triggers Card -->
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="home-card pa-5 rounded-lg d-flex flex-column justify-space-between"
          elevation="2"
          hover
          to="/configuration/triggers"
        >
          <div>
            <div class="d-flex align-center justify-space-between mb-3">
              <v-avatar color="warning" variant="tonal" size="52" class="rounded-lg">
                <v-icon size="28" color="warning">{{ triggerIcon }}</v-icon>
              </v-avatar>
              <v-icon color="grey-lighten-1" size="20">mdi-arrow-top-right</v-icon>
            </div>
            <div class="text-h3 font-weight-bold mb-1 text-high-emphasis">
              {{ triggersCount }}
            </div>
            <div class="text-caption font-weight-bold text-grey-darken-1 text-uppercase tracking-wider">
              Triggers
            </div>
          </div>

          <div class="mt-4 pt-3 border-t">
            <div class="status-slot mb-2">
              <span class="text-caption text-medium-emphasis">
                <v-icon size="14" color="success" class="mr-1">mdi-check-circle-outline</v-icon>
                Automations active
              </span>
            </div>
            <v-btn
              variant="plain"
              size="small"
              color="primary"
              class="px-0 text-none font-weight-medium"
              append-icon="mdi-chevron-right"
              to="/configuration/triggers"
            >
              {{ triggersCount }} triggers
            </v-btn>
          </div>
        </v-card>
      </v-col>

      <!-- 3. Watchers Card -->
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="home-card pa-5 rounded-lg d-flex flex-column justify-space-between"
          elevation="2"
          hover
          to="/configuration/watchers"
        >
          <div>
            <div class="d-flex align-center justify-space-between mb-3">
              <v-avatar color="accent" variant="tonal" size="52" class="rounded-lg">
                <v-icon size="28" color="accent">{{ watcherIcon }}</v-icon>
              </v-avatar>
              <v-icon color="grey-lighten-1" size="20">mdi-arrow-top-right</v-icon>
            </div>
            <div class="text-h3 font-weight-bold mb-1 text-high-emphasis">
              {{ watchersCount }}
            </div>
            <div class="text-caption font-weight-bold text-grey-darken-1 text-uppercase tracking-wider">
              Watchers
            </div>
          </div>

          <div class="mt-4 pt-3 border-t">
            <div class="status-slot mb-2">
              <span class="text-caption text-medium-emphasis">
                <v-icon size="14" color="success" class="mr-1">mdi-check-circle-outline</v-icon>
                Polling active
              </span>
            </div>
            <v-btn
              variant="plain"
              size="small"
              color="primary"
              class="px-0 text-none font-weight-medium"
              append-icon="mdi-chevron-right"
              to="/configuration/watchers"
            >
              {{ watchersCount }} watchers
            </v-btn>
          </div>
        </v-card>
      </v-col>

      <!-- 4. Registries Card -->
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="home-card pa-5 rounded-lg d-flex flex-column justify-space-between"
          elevation="2"
          hover
          to="/configuration/registries"
        >
          <div>
            <div class="d-flex align-center justify-space-between mb-3">
              <v-avatar color="indigo" variant="tonal" size="52" class="rounded-lg">
                <v-icon size="28" color="indigo">{{ registryIcon }}</v-icon>
              </v-avatar>
              <v-icon color="grey-lighten-1" size="20">mdi-arrow-top-right</v-icon>
            </div>
            <div class="text-h3 font-weight-bold mb-1 text-high-emphasis">
              {{ registriesCount }}
            </div>
            <div class="text-caption font-weight-bold text-grey-darken-1 text-uppercase tracking-wider">
              Registries
            </div>
          </div>

          <div class="mt-4 pt-3 border-t">
            <div class="status-slot mb-2">
              <span class="text-caption text-medium-emphasis">
                <v-icon size="14" color="success" class="mr-1">mdi-check-circle-outline</v-icon>
                Registries synced
              </span>
            </div>
            <v-btn
              variant="plain"
              size="small"
              color="primary"
              class="px-0 text-none font-weight-medium"
              append-icon="mdi-chevron-right"
              to="/configuration/registries"
            >
              {{ registriesCount }} registries
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { getContainerIcon, getAllContainers } from "@/services/container";
import { getRegistryIcon, getAllRegistries } from "@/services/registry";
import { getTriggerIcon, getAllTriggers } from "@/services/trigger";
import { getWatcherIcon, getAllWatchers } from "@/services/watcher";
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      containersCount: 0,
      containersToUpdateCount: 0,
      triggersCount: 0,
      watchersCount: 0,
      registriesCount: 0,
      containerIcon: getContainerIcon(),
      registryIcon: getRegistryIcon(),
      triggerIcon: getTriggerIcon(),
      watcherIcon: getWatcherIcon(),
    };
  },

  computed: {
    containerUpdateMessage() {
      if (this.containersToUpdateCount > 0) {
        return `${this.containersToUpdateCount} updates available`;
      }
      return "all containers are up-to-date";
    },
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const containers = await getAllContainers();
      const watchers = await getAllWatchers();
      const registries = await getAllRegistries();
      const triggers = await getAllTriggers();
      next((vm: any) => {
        vm.containersCount = containers.length;
        vm.triggersCount = triggers.length;
        vm.watchersCount = watchers.length;
        vm.registriesCount = registries.length;
        vm.containersToUpdateCount = containers.filter(
          (container: any) => container.updateAvailable,
        ).length;
      });
    } catch (e: any) {
      next((vm: any) => {
        if (vm.eventBus) {
          vm.eventBus.emit("notify", `Error when loading dashboard data (${e.message})`, "error");
        }
      });
    }
  },
});
</script>

<style scoped>
.hero-banner {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.04) 0%, rgba(var(--v-theme-surface), 1) 100%) !important;
  border: 1px solid rgba(var(--v-border-color), 0.14) !important;
}

.hero-banner::after {
  content: "";
  position: absolute;
  top: -60%;
  right: -10%;
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, rgba(var(--v-theme-primary), 0.08) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.z-index-1 {
  position: relative;
  z-index: 1;
}

.tracking-wider {
  letter-spacing: 0.05em;
}

.home-card {
  height: 100%;
  min-height: 190px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(var(--v-border-color), 0.12);
}

.home-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.08) !important;
  border-color: rgba(var(--v-theme-primary), 0.35);
}

.border-t {
  border-top: 1px solid rgba(var(--v-border-color), 0.08);
}

.status-slot {
  min-height: 28px;
  display: flex;
  align-items: center;
}

.update-status {
  height: auto;
  min-height: 28px;
  padding-top: 4px;
  padding-bottom: 4px;
}

.update-status :deep(.v-btn__content) {
  white-space: normal;
}
</style>
