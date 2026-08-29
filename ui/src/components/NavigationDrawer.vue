<template>
  <v-navigation-drawer
    app
    :rail="mini"
    permanent
    :disable-route-watcher="true"
    :clipped="true"
    color="primary"
    theme="dark"
  >
    <v-toolbar flat class="ma-0 pa-0" color="primary">
      <v-app-bar-nav-icon @click.stop="mini = !mini">
        <v-icon v-if="!mini">mdi-close</v-icon>
        <v-icon v-else>mdi-menu</v-icon>
      </v-app-bar-nav-icon>
      <v-toolbar-title v-if="!mini" class="text-body-1">WUD</v-toolbar-title>
    </v-toolbar>
    <v-list nav class="pt-0 pb-0">
      <v-fade-transition group hide-on-leave mode="in-out">
        <v-list-item to="/" key="home" class="mb-0" prepend-icon="mdi-home">
          <v-list-item-title>Home</v-list-item-title>
        </v-list-item>
        <v-list-item
          to="/containers"
          key="containers"
          class="mb-0"
          :prepend-icon="containerIcon"
        >
          <v-list-item-title>Containers</v-list-item-title>
        </v-list-item>

        <v-list-item key="divider" class="mb-0" dense>
          <v-divider />
        </v-list-item>

        <v-list-group v-if="!mini" key="configuration" color="white">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-cogs">
              <v-list-item-title>Configuration</v-list-item-title>
            </v-list-item>
          </template>
          <v-list-item
            v-for="configurationItem in configurationItemsSorted"
            :key="configurationItem.to"
            :to="configurationItem.to"
            class="mb-0 pl-2"
            :prepend-icon="configurationItem.icon"
          >
            <v-list-item-title class="text-capitalize"
              >{{ configurationItem.name }}
            </v-list-item-title>
          </v-list-item>
        </v-list-group>
        <v-list-item
          v-else
          v-for="configurationItem in configurationItemsSorted"
          :key="configurationItem.to"
          :to="configurationItem.to"
          class="mb-0"
          :prepend-icon="configurationItem.icon"
        >
          <v-list-item-title class="text-capitalize"
            >{{ configurationItem.name }}
          </v-list-item-title>
        </v-list-item>
      </v-fade-transition>
    </v-list>

    <template v-slot:append v-if="!mini">
      <v-list>
        <v-list-item class="ml-2 mb-2">
          <v-switch
            hide-details
            inset
            label="Dark mode"
            v-model="darkMode"
            @update:model-value="toggleDarkMode"
          >
            <template v-slot:label>
              <v-icon>mdi-weather-night</v-icon>
            </template>
          </v-switch>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts">
import { ref, onMounted, defineComponent } from "vue";
import { useTheme } from "vuetify";
import { getContainerIcon } from "@/services/container";
import { getRegistryIcon } from "@/services/registry";
import { getTriggerIcon } from "@/services/trigger";
import { getServerIcon } from "@/services/server";
import { getWatcherIcon } from "@/services/watcher";
import { getAuthenticationIcon } from "@/services/authentication";

export default defineComponent({
  setup() {
    const theme = useTheme();
    const mini = ref(true);
    const darkMode = ref(localStorage.darkMode === "true");
    
    const configurationItems = [
      {
        to: "/configuration/authentications",
        name: "auth",
        icon: getAuthenticationIcon(),
      },
      {
        to: "/configuration/registries",
        name: "registries",
        icon: getRegistryIcon(),
      },
      {
        to: "/configuration/triggers",
        name: "triggers",
        icon: getTriggerIcon(),
      },
      {
        to: "/configuration/watchers",
        name: "watchers",
        icon: getWatcherIcon(),
      },
      {
        to: "/configuration/server",
        name: "server",
        icon: getServerIcon(),
      },
    ];

    const toggleDarkMode = (value: boolean) => {
      darkMode.value = value;
      localStorage.darkMode = String(darkMode.value);
      theme.global.name.value = darkMode.value ? "dark" : "light";
    };

    onMounted(() => {
      theme.global.name.value = darkMode.value ? "dark" : "light";
    });

    return {
      mini,
      darkMode,
      containerIcon: getContainerIcon(),
      configurationItems,
      toggleDarkMode,
    };
  },

  computed: {
    configurationItemsSorted() {
      return [...this.configurationItems].sort((item1, item2) =>
        item1.name.localeCompare(item2.name),
      );
    },
  },
});
</script>
