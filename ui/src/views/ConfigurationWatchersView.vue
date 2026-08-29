<template>
  <v-container fluid>
    <v-row v-for="watcher in watchers" :key="watcher.name">
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="watcher" />
      </v-col>
    </v-row>
    <v-row v-if="watchers.length === 0">
      <v-card-subtitle class="text-h6">No watchers configured</v-card-subtitle>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import ConfigurationItem from "@/components/ConfigurationItem.vue";
import { getAllWatchers } from "@/services/watcher";
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      watchers: [] as any[],
    };
  },
  components: {
    ConfigurationItem,
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const watchers = await getAllWatchers();
      next((vm: any) => (vm.watchers = watchers));
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus.emit(
          "notify",
          `Error when trying to load the watchers (${e.message})`,
          "error",
        );
      });
    }
  },
});
</script>
