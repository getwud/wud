<template>
  <v-container fluid class="pa-4">
    <!-- Top Toolbar with Title, Search Filter & Refresh -->
    <v-card class="border mb-4" elevation="0" rounded="lg">
      <v-toolbar color="surface" density="compact" class="px-3 py-1">
        <v-icon :icon="serverIcon" class="mr-2 text-primary" size="24"></v-icon>
        <div class="d-flex align-center">
          <span class="text-subtitle-1 font-weight-bold mr-2">Server &amp; System Configuration</span>
        </div>

        <v-spacer></v-spacer>

        <!-- Search Input -->
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Filter parameters..."
          density="compact"
          variant="outlined"
          hide-details
          clearable
          single-line
          class="mr-2 search-field"
          style="max-width: 260px;"
        ></v-text-field>

        <v-btn
          icon="mdi-refresh"
          variant="text"
          size="small"
          @click="refreshServer"
          :loading="isLoading"
          title="Refresh"
        ></v-btn>
      </v-toolbar>
    </v-card>

    <!-- Dashboard Grid: Server, Logs, Store -->
    <v-row>
      <v-col
        v-for="card in cards"
        :key="card.id"
        cols="12"
        md="4"
        class="d-flex flex-column"
      >
        <v-card
          class="border fill-height d-flex flex-column dashboard-card"
          elevation="0"
          rounded="lg"
        >
          <!-- Card Header -->
          <v-toolbar color="surface" density="compact" class="px-3 py-1 border-b">
            <v-icon :icon="card.icon" class="mr-2 text-primary" size="22"></v-icon>
            <div class="d-flex flex-column justify-center overflow-hidden mr-2">
              <span class="text-subtitle-2 font-weight-bold text-truncate">{{ card.title }}</span>
            </div>
            <v-spacer></v-spacer>
            <v-chip
              size="x-small"
              color="primary"
              variant="tonal"
              class="font-weight-medium"
            >
              {{ card.filteredItems.length }} {{ card.filteredItems.length === 1 ? 'param' : 'params' }}
            </v-chip>
          </v-toolbar>

          <!-- Card Content / Parameters List -->
          <v-card-text class="pa-0 flex-grow-1 bg-surface">
            <v-list density="compact" v-if="card.filteredItems.length > 0" class="py-0">
              <template v-for="(cfg, index) in card.filteredItems" :key="cfg.key">
                <v-list-item class="py-2 px-3">
                  <div class="d-flex align-center justify-space-between mb-1">
                    <span class="text-caption font-weight-bold text-capitalize text-grey-darken-1">
                      {{ cfg.key }}
                    </span>
                    <v-btn
                      icon="mdi-content-copy"
                      variant="text"
                      size="x-small"
                      density="compact"
                      color="grey"
                      class="opacity-60 hover-opacity-100"
                      @click.stop="copyValue(cfg.key, cfg.value)"
                      title="Copy value"
                    ></v-btn>
                  </div>
                  <div>
                    <!-- Boolean Value -->
                    <template v-if="typeof cfg.value === 'boolean'">
                      <v-chip
                        size="x-small"
                        :color="cfg.value ? 'success' : 'grey'"
                        variant="tonal"
                        label
                        class="font-weight-medium"
                      >
                        {{ cfg.value ? 'true' : 'false' }}
                      </v-chip>
                    </template>
                    <!-- Empty / Null Value or Empty Object -->
                    <template v-else-if="cfg.value === undefined || cfg.value === null || cfg.value === '' || (typeof cfg.value === 'object' && Object.keys(cfg.value).length === 0)">
                      <span class="text-caption text-grey font-italic">&lt;empty&gt;</span>
                    </template>
                    <!-- Complex Object or Array -->
                    <template v-else-if="typeof cfg.value === 'object'">
                      <pre class="bg-grey-lighten-4 dark:bg-grey-darken-4 pa-2 rounded text-caption overflow-x-auto my-1">{{ JSON.stringify(cfg.value, null, 2) }}</pre>
                    </template>
                    <!-- Standard string / number -->
                    <template v-else>
                      <span class="text-body-2 font-weight-medium text-high-emphasis word-break-all">
                        {{ cfg.value }}
                      </span>
                    </template>
                  </div>
                </v-list-item>
                <v-divider v-if="index < card.filteredItems.length - 1" />
              </template>
            </v-list>

            <!-- Empty State -->
            <div v-else class="pa-6 text-center text-grey">
              <v-icon size="36" class="mb-2 opacity-50">{{ card.icon }}</v-icon>
              <div class="text-body-2" v-if="search">No matching parameters</div>
              <div class="text-body-2" v-else>Default configuration</div>
              <div class="text-caption text-grey" v-if="!search">No custom parameters set</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { getServer, getServerIcon } from "@/services/server";
import { getLog, getLogIcon } from "@/services/log";
import { getStore, getStoreIcon } from "@/services/store";
import { defineComponent } from "vue";

export default defineComponent({
  name: "ConfigurationServerView",
  data() {
    return {
      server: {} as any,
      store: {} as any,
      log: {} as any,
      search: "",
      isLoading: false,
    };
  },
  computed: {
    serverIcon(): string {
      return getServerIcon();
    },
    logIcon(): string {
      return getLogIcon();
    },
    storeIcon(): string {
      return getStoreIcon();
    },
    cards(): Array<{
      id: string;
      title: string;
      icon: string;
      items: Array<{ key: string; value: any }>;
      filteredItems: Array<{ key: string; value: any }>;
    }> {
      const sections = [
        {
          id: "server",
          title: "Server",
          icon: this.serverIcon,
          items: this.formatItems(this.server?.configuration),
        },
        {
          id: "logs",
          title: "Logs",
          icon: this.logIcon,
          items: this.formatItems(this.log),
        },
        {
          id: "store",
          title: "Store",
          icon: this.storeIcon,
          items: this.formatItems(this.store?.configuration),
        },
      ];

      return sections.map((section) => ({
        ...section,
        filteredItems: this.filterItems(section.items),
      }));
    },
  },

  methods: {
    formatItems(configObj: any, prefix = ""): Array<{ key: string; value: any }> {
      if (!configObj || typeof configObj !== "object") {
        return [];
      }
      const items: Array<{ key: string; value: any }> = [];
      for (const key of Object.keys(configObj)) {
        const val = configObj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (val !== null && typeof val === "object" && !Array.isArray(val)) {
          if (Object.keys(val).length === 0) {
            items.push({ key: fullKey, value: null });
          } else {
            items.push(...this.formatItems(val, fullKey));
          }
        } else {
          items.push({ key: fullKey, value: val });
        }
      }
      return items.sort((a, b) => a.key.localeCompare(b.key));
    },

    filterItems(items: Array<{ key: string; value: any }>): Array<{ key: string; value: any }> {
      if (!this.search) {
        return items;
      }
      const s = this.search.toLowerCase().trim();
      return items.filter(
        (item) =>
          item.key.toLowerCase().includes(s) ||
          (typeof item.value === "string" && item.value.toLowerCase().includes(s)) ||
          (typeof item.value === "number" && String(item.value).includes(s)) ||
          (typeof item.value === "boolean" && String(item.value).includes(s))
      );
    },

    copyValue(key: string, value: any) {
      const textToCopy =
        value === null || value === undefined
          ? ""
          : typeof value === "object"
          ? JSON.stringify(value, null, 2)
          : String(value);
      navigator.clipboard.writeText(textToCopy);
      (this as any).$eventBus?.emit("notify", `${key} copied to clipboard`);
    },

    async refreshServer() {
      this.isLoading = true;
      try {
        const [server, store, log] = await Promise.all([
          getServer(),
          getStore(),
          getLog(),
        ]);
        this.server = server;
        this.store = store;
        this.log = log;
      } catch (e: any) {
        (this as any).$eventBus?.emit(
          "notify",
          `Error when trying to load the server configuration (${e.message})`,
          "error"
        );
      } finally {
        this.isLoading = false;
      }
    },
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const [server, store, log] = await Promise.all([
        getServer(),
        getStore(),
        getLog(),
      ]);

      next((vm: any) => {
        vm.server = server;
        vm.store = store;
        vm.log = log;
      });
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus?.emit(
          "notify",
          `Error when trying to load the server configuration (${e.message})`,
          "error"
        );
      });
    }
  },
});
</script>

<style scoped>
.word-break-all {
  word-break: break-word;
}
.hover-opacity-100:hover {
  opacity: 1 !important;
}
.dashboard-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.dashboard-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06) !important;
}
</style>
