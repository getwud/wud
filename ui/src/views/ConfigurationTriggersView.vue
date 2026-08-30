<template>
  <v-container fluid class="pa-4">
    <v-card class="border" elevation="0" rounded="lg">
      <!-- Toolbar Header with Search & Actions -->
      <v-toolbar color="surface" density="compact" class="px-3 py-1">
        <v-icon :icon="triggerIcon" class="mr-2 text-primary" size="24"></v-icon>
        <div class="d-flex align-center">
          <span class="text-subtitle-1 font-weight-bold mr-2">Triggers</span>
          <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium">
            {{ triggersFiltered.length }}
          </v-chip>
        </div>

        <v-spacer></v-spacer>

        <!-- Search Input -->
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search triggers..."
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
          @click="refreshTriggers"
          :loading="isLoading"
          title="Refresh"
        ></v-btn>
      </v-toolbar>

      <v-divider />

      <!-- Data Table -->
      <v-data-table
        :headers="headers"
        :items="triggersFiltered"
        item-value="id"
        hover
        class="bg-surface"
        @click:row="onRowClick"
      >
        <!-- Type Column -->
        <template #[`item.type`]="{ item }">
          <div class="d-flex align-center">
            <v-icon size="small" class="mr-2 text-primary">mdi-bell-outline</v-icon>
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
            <v-icon size="64" class="mb-4 opacity-50">{{ triggerIcon }}</v-icon>
            <div class="text-h6">No triggers found</div>
            <div class="text-body-2" v-if="search">Try clearing your search</div>
            <div class="text-body-2" v-else>No triggers configured</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Slide-over Trigger Detail Drawer -->
    <v-navigation-drawer
      v-model="drawerOpen"
      location="right"
      temporary
      :width="560"
      class="border-s"
      elevation="16"
    >
      <template v-if="selectedTrigger">
        <!-- Drawer Header -->
        <v-toolbar flat color="surface" class="border-b px-2">
          <div class="d-flex align-center overflow-hidden mr-2" style="flex: 1">
            <v-icon :icon="triggerIcon" size="24" class="mr-2 text-primary flex-shrink-0" />
            <div class="text-truncate">
              <div class="text-subtitle-1 font-weight-bold text-truncate">
                {{ selectedTrigger.name }}
              </div>
              <div class="text-caption text-grey text-truncate">
                {{ selectedTrigger.type }} trigger details
              </div>
            </div>
          </div>
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            class="mr-2"
            prepend-icon="mdi-test-tube"
            @click="testDialogOpen = true"
          >
            Test
          </v-btn>
          <v-btn icon="mdi-close" variant="text" size="small" @click="drawerOpen = false" title="Close details"></v-btn>
        </v-toolbar>

        <!-- Drawer Body -->
        <div class="overflow-y-auto" style="max-height: calc(100vh - 64px);">
          <configuration-drawer-content
            :item="selectedTrigger"
            :fallback-icon="triggerIcon"
          >
            <template #actions>
              <v-btn
                variant="outlined"
                color="primary"
                size="small"
                block
                prepend-icon="mdi-test-tube"
                @click="testDialogOpen = true"
              >
                Test this trigger
              </v-btn>
            </template>
          </configuration-drawer-content>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Test Trigger Dialog -->
    <trigger-test-dialog
      v-if="selectedTrigger"
      v-model="testDialogOpen"
      :trigger="selectedTrigger"
    />
  </v-container>
</template>

<script lang="ts">
import ConfigurationDrawerContent from "@/components/ConfigurationDrawerContent.vue";
import TriggerTestDialog from "@/components/TriggerTestDialog.vue";
import { getAllTriggers, getTriggerIcon } from "@/services/trigger";
import { defineComponent } from "vue";

export default defineComponent({
  name: "ConfigurationTriggersView",
  components: {
    ConfigurationDrawerContent,
    TriggerTestDialog,
  },

  data() {
    return {
      triggers: [] as any[],
      search: "",
      drawerOpen: false,
      selectedTrigger: null as any,
      testDialogOpen: false,
      isLoading: false,
    };
  },

  computed: {
    triggerIcon(): string {
      return getTriggerIcon();
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
    triggersFiltered(): any[] {
      if (!this.search) {
        return this.triggers;
      }
      const s = this.search.toLowerCase().trim();
      return this.triggers.filter(
        (trigger) =>
          (trigger.name && trigger.name.toLowerCase().includes(s)) ||
          (trigger.type && trigger.type.toLowerCase().includes(s)) ||
          (trigger.id && trigger.id.toLowerCase().includes(s))
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
        this.selectedTrigger = item;
        this.drawerOpen = true;
      }
    },
    async refreshTriggers() {
      this.isLoading = true;
      try {
        const triggers = await getAllTriggers();
        this.triggers = triggers.sort((t1: any, t2: any) => (t1.id || "").localeCompare(t2.id || ""));
        if (this.selectedTrigger) {
          const updated = this.triggers.find((t) => t.id === this.selectedTrigger.id);
          if (updated) {
            this.selectedTrigger = updated;
          }
        }
      } catch (e: any) {
        (this as any).$eventBus?.emit(
          "notify",
          `Error when trying to load the triggers (${e.message})`,
          "error"
        );
      } finally {
        this.isLoading = false;
      }
    },
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const triggers = await getAllTriggers();
      next((vm: any) => (vm.triggers = triggers));
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus?.emit(
          "notify",
          `Error when trying to load the triggers (${e.message})`,
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
