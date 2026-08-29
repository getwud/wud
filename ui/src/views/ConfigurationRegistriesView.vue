<template>
  <v-container fluid>
    <v-row v-for="registry in registries" :key="registry.id">
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="registry" />
      </v-col>
    </v-row>
    <v-row v-if="registries.length === 0">
      <v-card-subtitle class="text-h6"
        >No registries configured</v-card-subtitle
      >
    </v-row>
  </v-container>
</template>

<script lang="ts">
import ConfigurationItem from "@/components/ConfigurationItem.vue";
import { getAllRegistries, getRegistryProviderIcon } from "@/services/registry";
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      registries: [] as any[],
    };
  },
  components: {
    ConfigurationItem,
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const registries = await getAllRegistries();
      const registriesWithIcons = registries
        .map((registry) => ({
          ...registry,
          icon: getRegistryProviderIcon(registry.type),
        }))
        .sort((r1, r2) => r1.id.localeCompare(r2.id));
      next((vm: any) => (vm.registries = registriesWithIcons));
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus.emit(
          "notify",
          `Error when trying to load the registries (${e.message})`,
          "error",
        );
      });
    }
  },
});
</script>
