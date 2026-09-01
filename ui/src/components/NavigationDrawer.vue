<template>
  <v-navigation-drawer
    app
    :rail="mini"
    :width="260"
    permanent
    :disable-route-watcher="true"
    color="surface"
    class="border-r modern-drawer"
  >
    <!-- Brand / Drawer Header -->
    <div class="drawer-header d-flex align-center px-3 pt-3 pb-1" :class="{ 'justify-center': mini }">
      <div v-if="!mini" class="d-flex align-center flex-grow-1 overflow-hidden">
        <v-avatar color="primary" variant="flat" size="32" class="font-weight-black text-white mr-2 elevation-1 flex-shrink-0">
          W
        </v-avatar>
        <div class="d-flex flex-column overflow-hidden">
          <span class="text-subtitle-1 font-weight-black tracking-wide brand-title text-truncate">WUD</span>
        </div>
      </div>
      <v-btn
        :icon="mini ? 'mdi-menu' : 'mdi-chevron-left'"
        variant="text"
        density="comfortable"
        size="small"
        color="medium-emphasis"
        @click.stop="mini = !mini"
        :title="mini ? 'Expand sidebar' : 'Collapse sidebar'"
      ></v-btn>
    </div>

    <!-- Navigation List -->
    <v-list nav density="compact" class="px-2 pt-2 pb-3">
      <!-- Main section -->
      <v-list-item
        to="/"
        class="nav-item mb-1 rounded-lg"
        prepend-icon="mdi-home-variant-outline"
        color="primary"
      >
        <v-list-item-title class="font-weight-medium">Home</v-list-item-title>
        <v-tooltip activator="parent" location="right" v-if="mini">Home</v-tooltip>
      </v-list-item>

      <v-list-item
        to="/containers"
        class="nav-item mb-1 rounded-lg"
        :prepend-icon="containerIcon"
        color="primary"
      >
        <v-list-item-title class="font-weight-medium">Containers</v-list-item-title>
        <v-tooltip activator="parent" location="right" v-if="mini">Containers</v-tooltip>
      </v-list-item>

      <!-- Section Label: Configuration -->
      <div v-if="!mini" class="section-label px-3 mt-4 mb-1 text-overline text-medium-emphasis">
        Configuration
      </div>
      <v-divider v-else class="my-3 mx-2 opacity-50" />

      <!-- Configuration flattened items -->
      <v-list-item
        v-for="item in configurationItemsSorted"
        :key="item.to"
        :to="item.to"
        class="nav-item mb-1 rounded-lg"
        :prepend-icon="item.icon"
        color="primary"
      >
        <v-list-item-title class="font-weight-medium text-capitalize">
          {{ item.name }}
        </v-list-item-title>
        <v-tooltip activator="parent" location="right" v-if="mini">
          {{ item.name }}
        </v-tooltip>
      </v-list-item>
    </v-list>

    <!-- Footer Append: Docs & User Profile / Theme Switcher -->
    <template v-slot:append>
      <div class="px-2 pb-2">
        <v-divider class="mb-2 opacity-50" />

        <!-- Documentation Link -->
        <div v-if="mini" class="d-flex justify-center mb-1">
          <v-btn
            icon="mdi-book-open-page-variant-outline"
            variant="text"
            density="comfortable"
            size="small"
            color="medium-emphasis"
            href="https://getwud.github.io/wud/"
            target="_blank"
            class="rounded-lg"
          >
            <v-icon size="20">mdi-book-open-page-variant-outline</v-icon>
            <v-tooltip activator="parent" location="right">Documentation</v-tooltip>
          </v-btn>
        </div>
        <v-list-item
          v-else
          href="https://getwud.github.io/wud/"
          target="_blank"
          rounded="lg"
          class="nav-item mb-1 text-medium-emphasis"
          prepend-icon="mdi-book-open-page-variant-outline"
          append-icon="mdi-open-in-new"
        >
          <v-list-item-title class="text-body-2 font-weight-medium">Documentation</v-list-item-title>
        </v-list-item>

        <!-- User / Settings Menu -->
        <v-menu location="top end" offset="8" :close-on-content-click="false">
          <template v-slot:activator="{ props }">
            <div v-if="mini" v-bind="props" class="d-flex justify-center py-1 cursor-pointer">
              <v-avatar color="primary" variant="tonal" size="32" class="font-weight-bold text-caption text-primary">
                {{ userInitial }}
              </v-avatar>
              <v-tooltip activator="parent" location="right">{{ userName }}</v-tooltip>
            </div>
            <v-list-item
              v-else
              v-bind="props"
              rounded="lg"
              class="nav-item user-item"
            >
              <template v-slot:prepend>
                <v-avatar color="primary" variant="tonal" size="30" class="font-weight-bold text-caption text-primary mr-2">
                  {{ userInitial }}
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2 font-weight-bold text-truncate">
                {{ userName }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption text-medium-emphasis">
                {{ userSubtitle }}
              </v-list-item-subtitle>
              <template v-slot:append>
                <v-icon size="18" class="text-medium-emphasis">mdi-dots-vertical</v-icon>
              </template>
            </v-list-item>
          </template>

          <!-- Popover Card -->
          <v-card min-width="250" rounded="lg" elevation="6" class="pa-2 bg-surface border">
            <!-- User info header -->
            <div class="px-3 py-2 d-flex align-center">
              <v-avatar color="primary" variant="tonal" size="36" class="font-weight-bold text-primary mr-3">
                {{ userInitial }}
              </v-avatar>
              <div class="overflow-hidden">
                <div class="text-subtitle-2 font-weight-bold text-truncate">{{ userName }}</div>
                <div class="text-caption text-medium-emphasis">{{ userSubtitle }}</div>
              </div>
            </div>

            <v-divider class="my-2 opacity-50" />

            <!-- Dark Mode Switch Item -->
            <v-list-item rounded="md" class="px-3" @click="toggleDarkMode(!darkMode)">
              <template v-slot:prepend>
                <v-icon :icon="darkMode ? 'mdi-weather-night' : 'mdi-weather-sunny'" class="mr-2" size="20" />
              </template>
              <v-list-item-title class="text-body-2">Dark mode</v-list-item-title>
              <template v-slot:append>
                <v-switch
                  :model-value="darkMode"
                  @update:model-value="toggleDarkMode"
                  hide-details
                  density="compact"
                  color="primary"
                  inset
                  @click.stop
                />
              </template>
            </v-list-item>

            <!-- Logout Item -->
            <template v-if="user && user.username !== 'anonymous'">
              <v-divider class="my-2 opacity-50" />
              <v-list-item rounded="md" class="px-3 text-error" @click="logout">
                <template v-slot:prepend>
                  <v-icon icon="mdi-logout" color="error" class="mr-2" size="20" />
                </template>
                <v-list-item-title class="text-body-2 font-weight-medium">Log out</v-list-item-title>
              </v-list-item>
            </template>
          </v-card>
        </v-menu>

        <!-- Version Info (Option 1: separate line at bottom) -->
        <div v-if="!mini && version" class="app-version text-caption text-disabled text-center pt-2 font-weight-medium">
          WUD v{{ version }}
        </div>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts">
import { ref, computed, onMounted, inject, defineComponent } from "vue";
import { useTheme } from "vuetify";
import { useRouter } from "vue-router";
import { getContainerIcon } from "@/services/container";
import { getRegistryIcon } from "@/services/registry";
import { getTriggerIcon } from "@/services/trigger";
import { getServerIcon } from "@/services/server";
import { getWatcherIcon } from "@/services/watcher";
import { getAuthenticationIcon } from "@/services/authentication";
import { logout } from "@/services/auth";
import { getAppInfos } from "@/services/app";

export default defineComponent({
  props: {
    user: {
      type: Object,
      default: undefined,
    },
  },
  setup(props) {
    const theme = useTheme();
    const router = useRouter();
    const eventBus = inject("eventBus") as any;

    const mini = ref(true);
    const darkMode = ref(localStorage.darkMode === "true");
    const version = ref("");

    const configurationItems = [
      {
        to: "/configuration/server",
        name: "server",
        icon: getServerIcon(),
      },
      {
        to: "/configuration/registries",
        name: "registries",
        icon: getRegistryIcon(),
      },
      {
        to: "/configuration/watchers",
        name: "watchers",
        icon: getWatcherIcon(),
      },
      {
        to: "/configuration/triggers",
        name: "triggers",
        icon: getTriggerIcon(),
      },
      {
        to: "/configuration/authentications",
        name: "auth",
        icon: getAuthenticationIcon(),
      },
    ];

    const toggleDarkMode = (value: boolean) => {
      darkMode.value = value;
      localStorage.darkMode = String(darkMode.value);
      theme.global.name.value = darkMode.value ? "dark" : "light";
    };

    const performLogout = async () => {
      try {
        const logoutResult = await logout();
        if (logoutResult && logoutResult.logoutUrl) {
          window.location = logoutResult.logoutUrl as any;
        } else {
          await router.push({
            name: "login",
          });
        }
      } catch (e: any) {
        eventBus?.emit(
          "notify",
          `Error when trying to logout (${e.message})`,
          "error",
        );
      }
    };

    const userName = computed(() => {
      if (props.user && props.user.username) {
        return props.user.username;
      }
      return "Settings";
    });

    const userSubtitle = computed(() => {
      if (props.user && props.user.username && props.user.username !== "anonymous") {
        return "Connected";
      }
      return "Preferences";
    });

    const userInitial = computed(() => {
      if (props.user && props.user.username) {
        return props.user.username.charAt(0).toUpperCase();
      }
      return "W";
    });

    onMounted(async () => {
      theme.global.name.value = darkMode.value ? "dark" : "light";
      try {
        const appInfos = await getAppInfos();
        version.value = appInfos.version || "";
      } catch {
        // Ignore error if app info endpoint is unavailable
      }
    });

    return {
      mini,
      darkMode,
      containerIcon: getContainerIcon(),
      configurationItemsSorted: configurationItems,
      toggleDarkMode,
      logout: performLogout,
      userName,
      userSubtitle,
      userInitial,
      version,
    };
  },
});
</script>

<style scoped>
.modern-drawer {
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-header {
  height: 52px;
}

.brand-title {
  letter-spacing: 0.05em;
}

.section-label {
  font-size: 0.68rem !important;
  letter-spacing: 0.1em;
  font-weight: 700;
}

.nav-item {
  transition: background-color 0.15s ease, color 0.15s ease;
}

.user-item {
  cursor: pointer;
}
</style>

