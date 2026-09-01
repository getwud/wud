<template>
  <v-container fluid class="pa-4">
    <v-card class="border" elevation="0" rounded="lg">
      <!-- Toolbar Header with Search & Actions -->
      <v-toolbar color="surface" density="compact" class="px-3 py-1">
        <v-icon :icon="registryIcon" class="mr-2 text-primary" size="24"></v-icon>
        <div class="d-flex align-center">
          <span class="text-subtitle-1 font-weight-bold mr-2">Registries</span>
          <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium">
            {{ registriesFiltered.length }}
          </v-chip>
        </div>

        <v-spacer></v-spacer>

        <!-- Search Input -->
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search registries..."
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
          @click="refreshRegistries"
          :loading="isLoading"
          title="Refresh"
        ></v-btn>
      </v-toolbar>

      <v-divider />

      <!-- Data Table -->
      <v-data-table
        :headers="headers"
        :items="registriesFiltered"
        item-value="id"
        hover
        class="bg-surface"
        @click:row="onRowClick"
      >
        <!-- Provider Column -->
        <template #[`item.type`]="{ item }">
          <div class="d-flex align-center">
            <IconRenderer
              :icon="(item.raw ? item.raw.icon : item.icon) || 'si-docker'"
              :size="20"
              :margin-right="8"
            />
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
            <v-icon size="64" class="mb-4 opacity-50">{{ registryIcon }}</v-icon>
            <div class="text-h6">No registries found</div>
            <div class="text-body-2" v-if="search">Try clearing your search</div>
            <div class="text-body-2" v-else>No registries configured</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Slide-over Registry Detail Drawer -->
    <v-navigation-drawer
      v-model="drawerOpen"
      location="right"
      temporary
      :width="560"
      class="border-s"
      elevation="16"
    >
      <template v-if="selectedRegistry">
        <!-- Drawer Header -->
        <v-toolbar flat color="surface" class="border-b px-2">
          <div class="d-flex align-center overflow-hidden mr-2" style="flex: 1">
            <IconRenderer
              v-if="selectedRegistry.icon"
              :icon="selectedRegistry.icon"
              :size="24"
              class="mr-2 flex-shrink-0"
            />
            <div class="text-truncate">
              <div class="text-subtitle-1 font-weight-bold text-truncate">
                {{ selectedRegistry.name }}
              </div>
              <div class="text-caption text-grey text-truncate">
                {{ selectedRegistry.type }} registry details
              </div>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="drawerOpen = false" title="Close details"></v-btn>
        </v-toolbar>

        <!-- Drawer Body -->
        <div class="overflow-y-auto" style="max-height: calc(100vh - 64px);">
          <configuration-drawer-content
            :item="selectedRegistry"
            :fallback-icon="registryIcon"
          />
        </div>
      </template>
    </v-navigation-drawer>
  </v-container>
</template>

<script lang="ts">
import ConfigurationDrawerContent from "@/components/ConfigurationDrawerContent.vue";
import IconRenderer from "@/components/IconRenderer.vue";
import { getAllRegistries, getRegistryIcon, getRegistryProviderIcon } from "@/services/registry";
import { defineComponent } from "vue";

export default defineComponent({
  name: "ConfigurationRegistriesView",
  components: {
    ConfigurationDrawerContent,
    IconRenderer,
  },

  data() {
    return {
      registries: [] as any[],
      search: "",
      drawerOpen: false,
      selectedRegistry: null as any,
      isLoading: false,
    };
  },

  computed: {
    registryIcon(): string {
      return getRegistryIcon();
    },
    headers() {
      return [
        {
          title: "Provider",
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
    registriesFiltered(): any[] {
      if (!this.search) {
        return this.registries;
      }
      const s = this.search.toLowerCase().trim();
      return this.registries.filter(
        (reg) =>
          (reg.name && reg.name.toLowerCase().includes(s)) ||
          (reg.type && reg.type.toLowerCase().includes(s)) ||
          (reg.id && reg.id.toLowerCase().includes(s))
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
        this.selectedRegistry = item;
        this.drawerOpen = true;
      }
    },
    async refreshRegistries() {
      this.isLoading = true;
      try {
        const registries = await getAllRegistries();
        this.registries = registries
          .map((registry: any) => ({
            ...registry,
            icon: getRegistryProviderIcon(registry.type),
          }))
          .sort((r1: any, r2: any) => r1.id.localeCompare(r2.id));
        if (this.selectedRegistry) {
          const updated = this.registries.find((r) => r.id === this.selectedRegistry.id);
          if (updated) {
            this.selectedRegistry = updated;
          }
        }
      } catch (e: any) {
        (this as any).$eventBus?.emit(
          "notify",
          `Error when trying to load the registries (${e.message})`,
          "error"
        );
      } finally {
        this.isLoading = false;
      }
    },
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const registries = await getAllRegistries();
      const registriesWithIcons = registries
        .map((registry: any) => ({
          ...registry,
          icon: getRegistryProviderIcon(registry.type),
        }))
        .sort((r1: any, r2: any) => r1.id.localeCompare(r2.id));
      next((vm: any) => (vm.registries = registriesWithIcons));
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus?.emit(
          "notify",
          `Error when trying to load the registries (${e.message})`,
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

:deep(.v-data-table tbody tr:hover .icon-renderer) {
  transform: scale(1.1);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
</style>
