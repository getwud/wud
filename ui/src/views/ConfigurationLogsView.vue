<template>
  <v-container fluid>
    <v-row>
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="configurationItem" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import ConfigurationItem from "@/components/ConfigurationItem.vue";
import { getLog } from "@/services/log";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    ConfigurationItem,
  },
  data() {
    return {
      log: {} as any,
    };
  },

  computed: {
    configurationItem() {
      return {
        name: "logs",
        icon: "mdi-bug",
        configuration: {
          level: this.log.level,
        },
      };
    },
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const log = await getLog();
      next((vm: any) => (vm.log = log));
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus.emit(
          "notify",
          `Error when trying to load the log configuration (${e.message})`,
          "error",
        );
      });
    }
  },
});
</script>
