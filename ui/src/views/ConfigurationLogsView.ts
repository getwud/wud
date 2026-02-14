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
