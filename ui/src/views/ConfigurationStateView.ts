import ConfigurationItem from "@/components/ConfigurationItem.vue";
import { getStore } from "@/services/store";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    ConfigurationItem,
  },
  data() {
    return {
      state: {} as any,
    };
  },
  computed: {
    configurationItem() {
      return {
        name: "state",
        icon: "mdi-content-save",
        configuration: this.state.configuration,
      };
    },
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const state = await getStore();
      next((vm: any) => (vm.state = state));
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus.emit(
          "notify",
          `Error when trying to load the state configuration (${e.message})`,
          "error",
        );
      });
    }
  },
});
