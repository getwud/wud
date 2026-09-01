<template>
  <v-container fluid class="pa-4">
    <v-card class="border" elevation="0" rounded="lg">
      <!-- Toolbar Header with Search & Actions -->
      <v-toolbar color="surface" density="compact" class="px-3 py-1">
        <v-icon :icon="watcherIcon" class="mr-2 text-primary" size="24"></v-icon>
        <div class="d-flex align-center">
          <span class="text-subtitle-1 font-weight-bold mr-2">Watchers</span>
          <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium">
            {{ watchersFiltered.length }}
          </v-chip>
        </div>

        <v-spacer></v-spacer>

        <!-- Search Input -->
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search watchers..."
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
          @click="refreshWatchers"
          :loading="isLoading"
          title="Refresh"
        ></v-btn>
      </v-toolbar>

      <v-divider />

      <!-- Data Table -->
      <v-data-table
        :headers="headers"
        :items="watchersFiltered"
        item-value="id"
        hover
        class="bg-surface"
        @click:row="onRowClick"
      >
        <!-- Type Column -->
        <template #[`item.type`]="{ item }">
          <div class="d-flex align-center">
            <v-icon size="small" class="mr-2 text-primary">mdi-radar</v-icon>
            <v-chip label color="primary" variant="tonal" size="small" class="font-weight-medium">
              {{ item.raw ? item.raw.type : item.type }}
            </v-chip>
          </div>
        </template>

        <!-- Name Column -->
        <template #[`item.name`]="{ item }">
          <span class="font-weight-medium">
            {{ item.raw ? item.raw.name : item.name }}
          </span>
        </template>

        <!-- Configuration Summary Column -->
        <template #[`item.configuration`]="{ item }">
          <v-chip label variant="outlined" color="grey-darken-1" size="small">
            {{ getConfigurationCount(item.raw || item) }}
          </v-chip>
        </template>

        <!-- Empty state -->
        <template v-slot:no-data>
          <div class="pa-8 text-center text-grey">
            <v-icon size="64" class="mb-4 opacity-50">{{ watcherIcon }}</v-icon>
            <div class="text-h6">No watchers found</div>
            <div class="text-body-2" v-if="search">Try clearing your search</div>
            <div class="text-body-2" v-else>No watchers configured</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Slide-over Watcher Detail Drawer -->
    <v-navigation-drawer
      v-model="drawerOpen"
      location="right"
      temporary
      :width="560"
      class="border-s"
      elevation="16"
    >
      <template v-if="selectedWatcher">
        <!-- Drawer Header -->
        <v-toolbar flat color="surface" class="border-b px-2">
          <div class="d-flex align-center overflow-hidden mr-2" style="flex: 1">
            <v-icon :icon="watcherIcon" size="24" class="mr-2 text-primary flex-shrink-0" />
            <div class="text-truncate">
              <div class="text-subtitle-1 font-weight-bold text-truncate">
                {{ selectedWatcher.name }}
              </div>
              <div class="text-caption text-grey text-truncate">
                {{ selectedWatcher.type }} watcher details
              </div>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="drawerOpen = false" title="Close details"></v-btn>
        </v-toolbar>

        <!-- Drawer Body -->
        <div class="overflow-y-auto" style="max-height: calc(100vh - 64px);">
          <configuration-drawer-content
            :item="selectedWatcher"
            :fallback-icon="watcherIcon"
          />
        </div>
      </template>
    </v-navigation-drawer>
  </v-container>
</template>

<script lang="ts">
import ConfigurationDrawerContent from "@/components/ConfigurationDrawerContent.vue";
import { getAllWatchers, getWatcherIcon } from "@/services/watcher";
import { defineComponent } from "vue";

export default defineComponent({
  name: "ConfigurationWatchersView",
  components: {
    ConfigurationDrawerContent,
  },

  data() {
    return {
      watchers: [] as any[],
      search: "",
      drawerOpen: false,
      selectedWatcher: null as any,
      isLoading: false,
    };
  },

  computed: {
    watcherIcon(): string {
      return getWatcherIcon();
    },
    headers() {
      return [
        {
          title: "Type",
          key: "type",
          value: (item: any) => item.type || "",
          sortable: true,
        },
        {
          title: "Name",
          key: "name",
          value: (item: any) => item.name || "",
          sortable: true,
        },
        {
          title: "Configuration",
          key: "configuration",
          value: (item: any) => Object.keys(item.configuration || {}).length,
          sortable: true,
        },
      ];
    },
    watchersFiltered(): any[] {
      if (!this.search) {
        return this.watchers;
      }
      const s = this.search.toLowerCase().trim();
      return this.watchers.filter(
        (watcher) =>
          (watcher.name && watcher.name.toLowerCase().includes(s)) ||
          (watcher.type && watcher.type.toLowerCase().includes(s)) ||
          (watcher.id && watcher.id.toLowerCase().includes(s))
      );
    },
  },

  methods: {
    getConfigurationCount(item: any): string {
      const count = Object.keys(item.configuration || {}).length;
      return `${count} ${count === 1 ? "param" : "params"}`;
    },
    onRowClick(event: any, row: any) {
      const item = row?.item?.raw || row?.item || row;
      if (item) {
        this.selectedWatcher = item;
        this.drawerOpen = true;
      }
    },
    async refreshWatchers() {
      this.isLoading = true;
      try {
        const watchers = await getAllWatchers();
        this.watchers = watchers.sort((w1: any, w2: any) => (w1.id || w1.name || "").localeCompare(w2.id || w2.name || ""));
        if (this.selectedWatcher) {
          const updated = this.watchers.find((w) => (w.id || w.name) === (this.selectedWatcher.id || this.selectedWatcher.name));
          if (updated) {
            this.selectedWatcher = updated;
          }
        }
      } catch (e: any) {
        (this as any).$eventBus?.emit(
          "notify",
          `Error when trying to load the watchers (${e.message})`,
          "error"
        );
      } finally {
        this.isLoading = false;
      }
    },
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const watchers = await getAllWatchers();
      next((vm: any) => (vm.watchers = watchers));
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus?.emit(
          "notify",
          `Error when trying to load the watchers (${e.message})`,
          "error"
        );
      });
    }
  },
});
</script>

<style scoped>
:deep(.v-data-table tbody tr) {
  cursor: pointer;
  transition: background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s ease;
}

:deep(.v-data-table tbody tr:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  z-index: 1;
  position: relative;
}
</style>
