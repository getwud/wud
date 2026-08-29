<template>
  <v-footer app padless dark height="30px">
    <v-col cols="12" class="text-center text-caption pa-0">
      {{ new Date().getFullYear() }} — WUD (version {{ version }})
    </v-col>
  </v-footer>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { getAppInfos } from "@/services/app";

export default defineComponent({
  data() {
    return {
      version: "unknown",
    };
  },

  async beforeMount() {
    try {
      const appInfos = await getAppInfos();
      this.version = appInfos.version || "unknown";
    } catch (e: any) {
      (this as any).$eventBus.emit(
        "notify",
        `Error when trying to get app version (${e.message})`,
        "error",
      );
    }
  },
});
</script>
