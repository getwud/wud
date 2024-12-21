<template>
  <v-container fluid>
    <v-row>
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="serverConfiguration" />
      </v-col>
    </v-row>
    <v-row>
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="logConfiguration" />
      </v-col>
    </v-row>
    <v-row>
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="storeConfiguration" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import ConfigurationItem from "@/components/ConfigurationItem";
import { getServer } from "@/services/server";
import { getLog } from "@/services/log";
import { getStore } from "@/services/store";

export default {
  components: {
    ConfigurationItem,
  },
  data() {
    return {
      server: {},
      store: {},
      log: {},
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

      next((vm) => {
        vm.server = server;
        vm.store = store;
        vm.log = log;
      });
    } catch (e) {
      this.$root.$emit(
        "notify",
        `Error when trying to load the state configuration (${e.message})`,
        "error",
      );
    }
    next();
  },
};
</script>
