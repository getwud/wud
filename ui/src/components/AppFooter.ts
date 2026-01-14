import { getAppInfos } from "@/services/app";
import { defineComponent } from "vue";

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
