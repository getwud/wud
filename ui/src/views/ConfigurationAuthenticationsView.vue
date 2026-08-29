<template>
  <v-container fluid>
    <v-row v-for="watcher in authentications" :key="watcher.id">
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="watcher" />
      </v-col>
    </v-row>
    <v-row v-if="authentications.length === 0">
      <v-card-subtitle class="text-h6"
        >No authentication configured</v-card-subtitle
      >
    </v-row>
  </v-container>
</template>

<script lang="ts">
import ConfigurationItem from "@/components/ConfigurationItem.vue";
import { getAllAuthentications } from "@/services/authentication";
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      authentications: [] as any[],
    };
  },
  components: {
    ConfigurationItem,
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const authentications = await getAllAuthentications();
      next((vm: any) => (vm.authentications = authentications));
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus.emit(
          "notify",
          `Error when trying to load the authentications (${e.message})`,
          "error",
        );
      });
    }
  },
});
</script>
