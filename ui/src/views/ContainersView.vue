<template>
  <v-container fluid class="pa-4">
    <v-card class="border" elevation="0" rounded="lg">
      <container-filter
        :registries="registries"
        :registry-selected-init="registrySelected"
        :watchers="watchers"
        :watcher-selected-init="watcherSelected"
        :update-kinds="updateKinds"
        :update-kind-selected-init="updateKindSelected"
        :updateAvailable="updateAvailableSelected"
        :oldestFirst="oldestFirst"
        :groupByLabel="groupByLabel"
        :groupLabels="allContainerLabels"
        :total-count="containers.length"
        :filtered-count="containersFiltered.length"
        @registry-changed="onRegistryChanged"
        @watcher-changed="onWatcherChanged"
        @update-available-changed="onUpdateAvailableChanged"
        @oldest-first-changed="onOldestFirstChanged"
        @group-by-label-changed="onGroupByLabelChanged"
        @update-kind-changed="onUpdateKindChanged"
        @refresh-all-containers="onRefreshAllContainers"
        @reset-filters="onResetFilters"
      />
      
      <v-divider />

      <v-data-table
        :headers="headers"
        :items="containersFiltered"
        item-value="id"
        :group-by="groupBy"
        hover
        class="bg-surface"
        @click:row="onRowClick"
      >
        <template #group-header="{ item, columns, toggleGroup, isGroupOpen }">
          <tr class="v-data-table-group-header-row" @click="toggleGroup(item)">
            <td :colspan="columns.length" class="py-2.5 px-4 group-header-cell">
              <div class="d-flex align-center">
                <v-btn
                  :icon="isGroupOpen(item) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  density="comfortable"
                  class="mr-3 group-chevron"
                  @click.stop="toggleGroup(item)"
                />
                
                <v-icon size="small" color="primary" class="mr-1.5 opacity-80">mdi-tag-outline</v-icon>
                
                <span class="group-label-name text-caption font-weight-bold text-uppercase">
                  {{ groupByLabel }}
                </span>
                
                <span class="mx-2 text-disabled font-weight-light">/</span>
                
                <span 
                  class="group-label-value font-weight-bold text-body-2"
                  :class="item.value === '(empty)' ? 'text-disabled font-italic' : ''"
                >
                  {{ item.value }}
                </span>
                
                <v-chip
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  class="ml-3 font-weight-medium"
                >
                  <v-icon start size="x-small">mdi-docker</v-icon>
                  {{ item.items.length }} {{ item.items.length > 1 ? 'containers' : 'container' }}
                </v-chip>
              </div>
            </td>
          </tr>
        </template>

        <template #[`item.watcher`]="{ item }">
              <v-chip label color="primary" variant="tonal" size="small">
                <v-icon start size="small">mdi-update</v-icon>
                {{ item.raw ? item.raw.watcher : item.watcher }}
              </v-chip>
            </template>
            
            <template #[`item.registry`]="{ item }">
              <div class="d-flex align-center">
                <IconRenderer 
                  :icon="getRegistryProviderIcon(item.raw ? item.raw.image.registry.name : item.image.registry.name)"
                  :size="20"
                  :margin-right="8"
                />
                {{ item.raw ? item.raw.image.registry.name : item.image.registry.name }}
              </div>
            </template>

            <template #[`item.displayName`]="{ item }">
              <div class="d-flex align-center font-weight-medium">
                <IconRenderer 
                  :icon="(item.raw ? item.raw.displayIcon : item.displayIcon) || 'mdi:docker'"
                  :size="20"
                  :margin-right="8"
                />
                <span>{{ item.raw ? item.raw.displayName : item.displayName }}</span>
              </div>
            </template>

            <template #[`item.currentVersion`]="{ item }">
              <v-chip label variant="tonal" size="small" class="font-weight-medium">
                {{ item.raw ? item.raw.image.tag.value : item.image.tag.value }}
              </v-chip>
            </template>

            <template #[`item.update`]="{ item }">
              <template v-if="item.raw ? item.raw.updateAvailable : item.updateAvailable">
                <v-tooltip bottom>
                  <template v-slot:activator="{ props }">
                    <v-chip
                      label
                      variant="flat"
                      :color="getNewVersionClass(item.raw || item)"
                      size="small"
                      v-bind="props"
                      @click.stop="copyToClipboard('container new version', getNewVersion(item.raw || item))"
                      class="cursor-pointer font-weight-bold"
                    >
                      <v-icon start size="small">mdi-arrow-up-bold</v-icon>
                      {{ getNewVersion(item.raw || item) }}
                    </v-chip>
                  </template>
                  <span class="text-caption">Copy to clipboard</span>
                </v-tooltip>
              </template>
              <span v-else class="text-grey text-caption">Up to date</span>
            </template>

            <template v-slot:no-data>
              <div class="pa-8 text-center text-grey">
                <v-icon size="64" class="mb-4 opacity-50">mdi-docker</v-icon>
                <div class="text-h6">No containers found</div>
                <div class="text-body-2">Try adjusting your filters</div>
              </div>
            </template>
          </v-data-table>
        </v-card>

    <!-- Slide-over Container Detail Drawer -->
    <v-navigation-drawer
      v-model="drawerOpen"
      location="right"
      temporary
      :width="640"
      class="border-s"
      elevation="16"
    >
      <template v-if="selectedContainer">
        <!-- Drawer Header -->
        <v-toolbar flat color="surface" class="border-b px-2">
          <div class="d-flex align-center overflow-hidden mr-2" style="flex: 1">
            <IconRenderer
              :icon="selectedContainer.displayIcon || 'mdi:docker'"
              :size="26"
              class="mr-3 flex-shrink-0"
            />
            <div class="text-truncate">
              <div class="text-subtitle-1 font-weight-bold text-truncate">
                {{ selectedContainer.displayName || selectedContainer.name }}
              </div>
              <div class="text-caption text-grey text-truncate">
                {{ selectedContainer.image?.registry?.name }} &bull; {{ selectedContainer.watcher }}
              </div>
            </div>
          </div>
          <v-btn
            v-if="deleteEnabled"
            icon="mdi-delete"
            color="error"
            variant="text"
            size="small"
            class="mr-1"
            @click="confirmDelete(selectedContainer)"
            title="Delete container"
          ></v-btn>
          <v-btn icon="mdi-close" variant="text" size="small" @click="drawerOpen = false" title="Close details"></v-btn>
        </v-toolbar>

        <!-- Drawer Content Tabs -->
        <v-tabs v-model="drawerTab" color="primary" align-tabs="start" density="compact" class="border-b px-2 bg-surface">
          <v-tab value="update" v-if="selectedContainer.result">
            <v-icon start size="small">mdi-package-down</v-icon> Update
          </v-tab>
          <v-tab value="triggers">
            <v-icon start size="small">mdi-bell-ring</v-icon> Triggers
          </v-tab>
          <v-tab value="image">
            <v-icon start size="small">mdi-package-variant-closed</v-icon> Image
          </v-tab>
          <v-tab value="container">
            <IconRenderer :icon="selectedContainer.displayIcon || 'mdi:docker'" :size="16" :margin-right="4" /> Container
          </v-tab>
          <v-tab value="error" v-if="selectedContainer.error">
            <v-icon start size="small" color="error">mdi-alert</v-icon> Error
          </v-tab>
        </v-tabs>

        <!-- Drawer Tab Windows -->
        <div class="pa-4 flex-grow-1 overflow-y-auto" style="max-height: calc(100vh - 104px);">
          <v-window v-model="drawerTab">
            <v-window-item value="update" v-if="selectedContainer.result">
              <container-update
                :result="selectedContainer.result"
                :semver="selectedContainer.image?.tag?.semver"
                :update-kind="selectedContainer.updateKind"
                :update-available="selectedContainer.updateAvailable"
              />
            </v-window-item>
            <v-window-item value="triggers">
              <container-triggers :container="selectedContainer" />
            </v-window-item>
            <v-window-item value="image">
              <container-image :image="selectedContainer.image" />
            </v-window-item>
            <v-window-item value="container">
              <container-detail :container="selectedContainer" />
            </v-window-item>
            <v-window-item value="error" v-if="selectedContainer.error">
              <container-error :error="selectedContainer.error" />
            </v-window-item>
          </v-window>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="dialogDelete" width="500">
      <v-card class="text-center rounded-lg">
        <v-toolbar color="error" flat>
          <v-toolbar-title class="text-white">Delete the container?</v-toolbar-title>
        </v-toolbar>
        <v-card-text class="pt-6 pb-6 text-body-1">
          Delete <span class="font-weight-bold text-error">{{ containerToDelete?.name }}</span> from the list?<br />
          <span class="text-caption text-grey font-italic">(The real container won't be deleted)</span>
        </v-card-text>
        <v-card-actions class="justify-center pb-6">
          <v-btn variant="outlined" @click="dialogDelete = false" class="px-6">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="executeDelete" class="px-6">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import ContainerFilter from "@/components/ContainerFilter.vue";
import ContainerDetail from "@/components/ContainerDetail.vue";
import ContainerError from "@/components/ContainerError.vue";
import ContainerImage from "@/components/ContainerImage.vue";
import ContainerTriggers from "@/components/ContainerTriggers.vue";
import ContainerUpdate from "@/components/ContainerUpdate.vue";
import IconRenderer from "@/components/IconRenderer.vue";
import { deleteContainer, getAllContainers } from "@/services/container";
import { getRegistryProviderIcon } from "@/services/registry";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    ContainerFilter,
    ContainerDetail,
    ContainerError,
    ContainerImage,
    ContainerTriggers,
    ContainerUpdate,
    IconRenderer,
  },

  data() {
    return {
      containers: [] as any[],
      registrySelected: "",
      watcherSelected: "",
      updateKindSelected: "",
      updateAvailableSelected: false,
      groupByLabel: "",
      oldestFirst: false,
      
      drawerOpen: false,
      selectedContainer: null as any,
      drawerTab: "triggers",
      
      deleteEnabled: false,
      dialogDelete: false,
      containerToDelete: null as any,
    };
  },

  mounted() {
    this.deleteEnabled = (this as any).$serverConfig?.feature?.delete || false;
  },

  computed: {
    headers() {
      return [
        {
          title: "Watcher",
          key: "watcher",
          value: (item: any) => item.watcher || "",
          sortable: true,
        },
        {
          title: "Registry",
          key: "registry",
          value: (item: any) => item.image?.registry?.name || "",
          sortable: true,
        },
        {
          title: "Container",
          key: "displayName",
          value: (item: any) => item.displayName || item.name || "",
          sortable: true,
        },
        {
          title: "Version",
          key: "currentVersion",
          value: (item: any) => item.image?.tag?.value || "",
          sortRaw: (a: any, b: any) => {
            const aTag = a.image?.tag?.value || "";
            const bTag = b.image?.tag?.value || "";
            return aTag.localeCompare(bTag, undefined, { numeric: true });
          },
          sortable: true,
        },
        {
          title: "Update",
          key: "update",
          value: (item: any) => (item.updateAvailable ? this.getNewVersion(item) : ""),
          sortRaw: (a: any, b: any) => {
            const aVal = a.updateAvailable ? (this.getNewVersion(a) || "1") : "";
            const bVal = b.updateAvailable ? (this.getNewVersion(b) || "1") : "";
            if (!aVal && !bVal) return 0;
            if (!aVal) return 1;
            if (!bVal) return -1;
            return aVal.localeCompare(bVal, undefined, { numeric: true });
          },
          sortable: true,
        },
      ];
    },
    groupBy() {
      if (this.groupByLabel) {
        return [{ key: "containerGroup", order: "asc" }];
      }
      return [];
    },
    allContainerLabels() {
      const allLabels = this.containers.reduce((acc, container) => {
        return [...acc, ...Object.keys(container.labels ?? {})];
      }, []);
      return [...new Set(allLabels)].sort();
    },
    registries() {
      return [...new Set(this.containers.map((c) => c.image.registry.name).sort())];
    },
    watchers() {
      return [...new Set(this.containers.map((c) => c.watcher).sort())];
    },
    updateKinds() {
      return [
        ...new Set(
          this.containers
            .filter((c) => c.updateAvailable && c.updateKind?.kind === "tag" && c.updateKind?.semverDiff)
            .map((c) => c.updateKind.semverDiff)
            .sort()
        ),
      ];
    },
    containersFiltered() {
      return this.containers
        .filter((c) => (this.registrySelected ? this.registrySelected === c.image.registry.name : true))
        .filter((c) => (this.watcherSelected ? this.watcherSelected === c.watcher : true))
        .filter((c) => (this.updateKindSelected ? this.updateKindSelected === c.updateKind?.semverDiff : true))
        .filter((c) => (this.updateAvailableSelected ? c.updateAvailable : true))
        .map((c) => ({
          ...c,
          containerGroup: this.groupByLabel
            ? (c.labels && c.labels[this.groupByLabel] !== undefined && c.labels[this.groupByLabel] !== null && c.labels[this.groupByLabel] !== ""
                ? String(c.labels[this.groupByLabel])
                : "(empty)")
            : "",
        }))
        .sort((a, b) => {
          if (this.groupByLabel) {
            if (a.containerGroup !== b.containerGroup) {
              if (a.containerGroup === "(empty)") return 1;
              if (b.containerGroup === "(empty)") return -1;
              return a.containerGroup.localeCompare(b.containerGroup);
            }
          }
          const getImageDate = (item: any) => new Date(item.image?.created || 0);
          if (this.oldestFirst) return (getImageDate(a) as any) - (getImageDate(b) as any);
          return (a.displayName || a.name || "").localeCompare(b.displayName || b.name || "");
        });
    },
  },

  methods: {
    getRegistryProviderIcon,

    openContainerDrawer(container: any) {
      this.selectedContainer = container;
      this.drawerTab = container.result ? "update" : "triggers";
      this.drawerOpen = true;
    },

    onRowClick(event: any, row: any) {
      const item = row?.item?.raw || row?.item || row;
      if (item) {
        this.openContainerDrawer(item);
      }
    },
    
    getNewVersion(container: any) {
      let newVersion = "unknown";
      if (container.result?.created && container.image.created !== container.result.created) {
        newVersion = (this as any).$filters.dateTime(container.result.created);
      }
      if (container.updateKind) {
        newVersion = container.updateKind.remoteValue;
      }
      if (container.updateKind?.kind === "digest") {
        newVersion = (this as any).$filters.short(newVersion, 15);
      }
      return newVersion;
    },

    getNewVersionClass(container: any) {
      if (container.updateKind?.kind === "tag") {
        switch (container.updateKind.semverDiff) {
          case "major": return "error";
          case "minor": return "warning";
          case "patch": return "success";
        }
      }
      return "info";
    },

    copyToClipboard(kind: string, value: string) {
      navigator.clipboard.writeText(value);
      (this as any).$eventBus.emit("notify", `${kind} copied to clipboard`);
    },

    confirmDelete(container: any) {
      this.containerToDelete = container;
      this.dialogDelete = true;
    },

    async executeDelete() {
      if (!this.containerToDelete) return;
      this.dialogDelete = false;
      try {
        await deleteContainer(this.containerToDelete.id);
        this.containers = this.containers.filter((c) => c.id !== this.containerToDelete.id);
        if (this.selectedContainer && this.selectedContainer.id === this.containerToDelete.id) {
          this.drawerOpen = false;
          this.selectedContainer = null;
        }
      } catch (e: any) {
        (this as any).$eventBus.emit("notify", `Error when trying to delete the container (${e.message})`, "error");
      }
      this.containerToDelete = null;
    },

    onRegistryChanged(val: string) { this.registrySelected = val; this.updateQueryParams(); },
    onWatcherChanged(val: string) { this.watcherSelected = val; this.updateQueryParams(); },
    onUpdateAvailableChanged() { this.updateAvailableSelected = !this.updateAvailableSelected; this.updateQueryParams(); },
    onOldestFirstChanged() { this.oldestFirst = !this.oldestFirst; this.updateQueryParams(); },
    onGroupByLabelChanged(val: string) { this.groupByLabel = val; this.updateQueryParams(); },
    onUpdateKindChanged(val: string) { this.updateKindSelected = val; this.updateQueryParams(); },
    
    onResetFilters() {
      this.registrySelected = "";
      this.watcherSelected = "";
      this.updateKindSelected = "";
      this.groupByLabel = "";
      this.updateAvailableSelected = false;
      this.oldestFirst = false;
      this.updateQueryParams();
    },
    
    updateQueryParams() {
      const query: any = {};
      if (this.registrySelected) query["registry"] = this.registrySelected;
      if (this.watcherSelected) query["watcher"] = this.watcherSelected;
      if (this.updateKindSelected) query["update-kind"] = this.updateKindSelected;
      if (this.updateAvailableSelected) query["update-available"] = String(this.updateAvailableSelected);
      if (this.oldestFirst) query["oldest-first"] = String(this.oldestFirst);
      if (this.groupByLabel) query["group-by-label"] = this.groupByLabel;
      this.$router.push({ query });
    },
    
    onRefreshAllContainers(containersRefreshed: any[]) {
      this.containers = containersRefreshed;
      if (this.selectedContainer) {
        const updated = this.containers.find((c) => c.id === this.selectedContainer.id);
        if (updated) {
          this.selectedContainer = updated;
        }
      }
    },
  },

  async beforeRouteEnter(to, from, next) {
    const rs = to.query["registry"];
    const ws = to.query["watcher"];
    const uk = to.query["update-kind"];
    const ua = to.query["update-available"];
    const of = to.query["oldest-first"];
    const gl = to.query["group-by-label"];
    
    try {
      const containers = await getAllContainers();
      next((vm: any) => {
        if (rs) vm.registrySelected = rs;
        if (ws) vm.watcherSelected = ws;
        if (uk) vm.updateKindSelected = uk;
        if (ua) vm.updateAvailableSelected = String(ua).toLowerCase() === "true";
        if (of) vm.oldestFirst = String(of).toLowerCase() === "true";
        if (gl) vm.groupByLabel = gl;
        vm.containers = containers;
      });
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus.emit("notify", `Error when trying to get the containers (${e.message})`, "error");
      });
    }
  },
});
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

/* Group header styling with theme-aware accent and gradient */
.group-header-cell {
  background: linear-gradient(90deg, rgba(var(--v-theme-primary), 0.08) 0%, rgba(var(--v-theme-primary), 0.02) 100%);
  border-left: 3px solid rgb(var(--v-theme-primary)) !important;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.12) !important;
  transition: background 0.2s ease;
  user-select: none;
}

.group-label-name {
  color: rgb(var(--v-theme-primary));
  letter-spacing: 0.04em;
  opacity: 0.9;
}

.group-label-value {
  color: rgba(var(--v-theme-on-surface), 0.95);
}

.group-chevron {
  transition: transform 0.2s ease;
}

:deep(.v-data-table tbody tr.v-data-table-group-header-row) {
  cursor: pointer;
}

:deep(.v-data-table tbody tr.v-data-table-group-header-row:hover) {
  transform: none;
  box-shadow: none;
}

:deep(.v-data-table tbody tr.v-data-table-group-header-row:hover .group-header-cell) {
  background: linear-gradient(90deg, rgba(var(--v-theme-primary), 0.15) 0%, rgba(var(--v-theme-primary), 0.05) 100%);
}

/* Add micro-animation and pointer cursor for hover on standard rows */
:deep(.v-data-table tbody tr:not(.v-data-table-group-header-row)) {
  cursor: pointer;
  transition: background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s ease;
}

:deep(.v-data-table tbody tr:not(.v-data-table-group-header-row):hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  z-index: 1;
  position: relative;
}

/* Subtle icon bounce on hover */
:deep(.v-data-table tbody tr:hover .icon-renderer) {
  transform: scale(1.1);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
</style>