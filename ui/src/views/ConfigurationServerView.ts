import ConfigurationItem from "@/components/ConfigurationItem.vue";
import { getServer } from "@/services/server";
import { getLog } from "@/services/log";
import { getStore } from "@/services/store";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    ConfigurationItem,
  },
  data() {
    return {
      server: {} as any,
      store: {} as any,
      log: {} as any,
    };
  },
  computed: {
    serverConfiguration() {
      return {
        type: "server",
        name: "configuration",
        icon: "mdi-connection",
        configuration: this.server.configuration,
      };
    },
    logConfiguration() {
      return {
        type: "logs",
        name: "configuration",
        icon: "mdi-bug",
        configuration: this.log,
      };
    },
    storeConfiguration() {
      return {
        type: "store",
        name: "configuration",
        icon: "mdi-file-multiple",
        configuration: this.store.configuration,
      };
    },
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const server = await getServer();
      const store = await getStore();
      const log = await getLog();

      next((vm: any) => {
        vm.server = server;
        vm.store = store;
        vm.log = log;
      });
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
