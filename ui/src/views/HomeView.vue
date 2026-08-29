<template>
  <v-container>
    <v-row class="d-md-flex pa-md-15 ma-md-15">
      <v-col xs="12" sm="12" md="6" lg="3" xl="3">
        <v-card class="home-card text-center" variant="outlined">
          <v-icon color="secondary" class="home-icon">{{
            containerIcon
          }}</v-icon>
          <br />
          <v-btn variant="plain" size="x-large" to="/containers"
            >{{ containersCount }} containers</v-btn
          >
          <br />
          <v-btn
            class="update-status"
            size="small"
            variant="plain"
            :color="containersToUpdateCount > 0 ? 'warning' : 'success'"
            to="/containers?update-available=true"
            :style="{
              pointerEvents: containersToUpdateCount === 0 ? 'none' : 'auto',
            }"
            >({{ containerUpdateMessage }})</v-btn
          >
        </v-card>
      </v-col>
      <v-col xs="12" sm="12" md="6" lg="3" xl="3">
        <v-card class="home-card text-center" variant="outlined">
          <v-icon color="secondary" class="home-icon">{{ triggerIcon }}</v-icon>
          <br />
          <v-btn variant="plain" size="x-large" to="/configuration/triggers"
            >{{ triggersCount }} triggers</v-btn
          >
          <br />
        </v-card>
      </v-col>
      <v-col xs="12" sm="12" md="6" lg="3" xl="3">
        <v-card class="home-card text-center" variant="outlined">
          <v-icon color="secondary" class="home-icon">{{ watcherIcon }}</v-icon>
          <br />
          <v-btn variant="plain" size="x-large" to="/configuration/watchers"
            >{{ watchersCount }} watchers</v-btn
          >
        </v-card>
      </v-col>
      <v-col xs="12" sm="12" md="6" lg="3" xl="3">
        <v-card class="home-card text-center" variant="outlined">
          <v-icon color="secondary" class="home-icon">{{
            registryIcon
          }}</v-icon>
          <br />
          <v-btn variant="plain" size="x-large" to="/configuration/registries"
            >{{ registriesCount }} registries</v-btn
          >
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
/* height: 100% makes each card fill its column. Since v-row stretches
   columns to match the tallest one, all four cards end up the same
   height as whichever card needs the most room. */
.home-card {
  height: 100%;
  min-height: 160px;
}

.home-icon {
  font-size: 80px;
}

/* Let the status label wrap instead of overflowing the card.
   Vuetify sets white-space: nowrap on .v-btn__content and a fixed
   height on .v-btn, so both have to be relaxed. */
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
