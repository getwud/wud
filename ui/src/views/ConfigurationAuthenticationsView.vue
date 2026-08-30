<template>
  <v-container fluid class="pa-4">
    <v-card class="border" elevation="0" rounded="lg">
      <!-- Toolbar Header with Search & Actions -->
      <v-toolbar color="surface" density="compact" class="px-3 py-1">
        <v-icon :icon="authenticationIcon" class="mr-2 text-primary" size="24"></v-icon>
        <div class="d-flex align-center">
          <span class="text-subtitle-1 font-weight-bold mr-2">Authentications</span>
          <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium">
            {{ authenticationsFiltered.length }}
          </v-chip>
        </div>

        <v-spacer></v-spacer>

        <!-- Search Input -->
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search authentications..."
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
          @click="refreshAuthentications"
          :loading="isLoading"
          title="Refresh"
        ></v-btn>
      </v-toolbar>

      <v-divider />

      <!-- Data Table -->
      <v-data-table
        :headers="headers"
        :items="authenticationsFiltered"
        item-value="id"
        hover
        class="bg-surface"
        @click:row="onRowClick"
      >
        <!-- Type Column -->
        <template #[`item.type`]="{ item }">
          <div class="d-flex align-center">
            <v-icon size="small" class="mr-2 text-primary">mdi-key-outline</v-icon>
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
            <v-icon size="64" class="mb-4 opacity-50">{{ authenticationIcon }}</v-icon>
            <div class="text-h6">No authentications found</div>
            <div class="text-body-2" v-if="search">Try clearing your search</div>
            <div class="text-body-2" v-else>No authentications configured</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Slide-over Authentication Detail Drawer -->
    <v-navigation-drawer
      v-model="drawerOpen"
      location="right"
      temporary
      :width="560"
      class="border-s"
      elevation="16"
    >
      <template v-if="selectedAuthentication">
        <!-- Drawer Header -->
        <v-toolbar flat color="surface" class="border-b px-2">
          <div class="d-flex align-center overflow-hidden mr-2" style="flex: 1">
            <v-icon :icon="authenticationIcon" size="24" class="mr-2 text-primary flex-shrink-0" />
            <div class="text-truncate">
              <div class="text-subtitle-1 font-weight-bold text-truncate">
                {{ selectedAuthentication.name }}
              </div>
              <div class="text-caption text-grey text-truncate">
                {{ selectedAuthentication.type }} authentication details
              </div>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="drawerOpen = false" title="Close details"></v-btn>
        </v-toolbar>

        <!-- Drawer Body -->
        <div class="overflow-y-auto" style="max-height: calc(100vh - 64px);">
          <configuration-drawer-content
            :item="selectedAuthentication"
            :fallback-icon="authenticationIcon"
          />
        </div>
      </template>
    </v-navigation-drawer>
  </v-container>
</template>

<script lang="ts">
import ConfigurationDrawerContent from "@/components/ConfigurationDrawerContent.vue";
import { getAllAuthentications, getAuthenticationIcon } from "@/services/authentication";
import { defineComponent } from "vue";

export default defineComponent({
  name: "ConfigurationAuthenticationsView",
  components: {
    ConfigurationDrawerContent,
  },

  data() {
    return {
      authentications: [] as any[],
      search: "",
      drawerOpen: false,
      selectedAuthentication: null as any,
      isLoading: false,
    };
  },

  computed: {
    authenticationIcon(): string {
      return getAuthenticationIcon();
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
    authenticationsFiltered(): any[] {
      if (!this.search) {
        return this.authentications;
      }
      const s = this.search.toLowerCase().trim();
      return this.authentications.filter(
        (auth) =>
          (auth.name && auth.name.toLowerCase().includes(s)) ||
          (auth.type && auth.type.toLowerCase().includes(s)) ||
          (auth.id && auth.id.toLowerCase().includes(s))
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
        this.selectedAuthentication = item;
        this.drawerOpen = true;
      }
    },
    async refreshAuthentications() {
      this.isLoading = true;
      try {
        const authentications = await getAllAuthentications();
        this.authentications = authentications.sort((a1: any, a2: any) => (a1.id || "").localeCompare(a2.id || ""));
        if (this.selectedAuthentication) {
          const updated = this.authentications.find((a) => a.id === this.selectedAuthentication.id);
          if (updated) {
            this.selectedAuthentication = updated;
          }
        }
      } catch (e: any) {
        (this as any).$eventBus?.emit(
          "notify",
          `Error when trying to load the authentications (${e.message})`,
          "error"
        );
      } finally {
        this.isLoading = false;
      }
    },
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const authentications = await getAllAuthentications();
      next((vm: any) => (vm.authentications = authentications));
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus?.emit(
          "notify",
          `Error when trying to load the authentications (${e.message})`,
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
