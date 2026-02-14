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
