import TriggerDetail from "@/components/TriggerDetail.vue";
import { getAllTriggers } from "@/services/trigger";
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      triggers: [] as any[],
    };
  },
  components: {
    TriggerDetail,
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const triggers = await getAllTriggers();
      next((vm: any) => (vm.triggers = triggers));
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus.emit(
          "notify",
          `Error when trying to load the triggers (${e.message})`,
          "error",
        );
      });
    }
  },
});
