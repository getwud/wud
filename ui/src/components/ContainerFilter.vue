<template>
  <div class="filter-toolbar pa-4 bg-surface">
    <!-- Top toolbar: Title, Stats, Toggles, Actions -->
    <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-3">
      <!-- Left side: Icon, Title & Counts -->
      <div class="d-flex align-center gap-2">
        <v-icon color="primary" size="24" class="mr-2">mdi-docker</v-icon>
        <span class="text-subtitle-1 font-weight-bold mr-2">Containers</span>
        <v-chip
          v-if="totalCount !== undefined"
          size="small"
          variant="tonal"
          color="primary"
          class="font-weight-medium"
        >
          <template v-if="filteredCount !== undefined && filteredCount !== totalCount">
            {{ filteredCount }} / {{ totalCount }}
          </template>
          <template v-else>
            {{ totalCount }}
          </template>
        </v-chip>
      </div>

      <!-- Right side: Switches, Reset & Refresh Button -->
      <div class="d-flex align-center flex-wrap gap-3">
        <v-switch
          class="switch-compact mr-2"
          label="Update available"
          v-model="updateAvailableLocal"
          @update:modelValue="emitUpdateAvailableChanged"
          :hide-details="true"
          density="compact"
          color="warning"
        />

        <v-switch
          class="switch-compact mr-2"
          label="Oldest first"
          v-model="oldestFirstLocal"
          @update:modelValue="emitOldestFirstChanged"
          :hide-details="true"
          density="compact"
          color="primary"
        />

        <v-btn
          v-if="hasActiveFilters"
          variant="text"
          color="grey"
          size="small"
          density="comfortable"
          prepend-icon="mdi-filter-off-outline"
          class="mr-2"
          @click="resetFilters"
        >
          Reset
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          size="small"
          @click.stop="refreshAllContainers"
          :loading="isRefreshing"
          prepend-icon="mdi-refresh"
          class="font-weight-medium"
        >
          Watch now
        </v-btn>
      </div>
    </div>

    <!-- Bottom Filters Row: Selects & Autocomplete -->
    <v-row dense>
      <v-col cols="12" sm="6" md="3">
        <v-select
          :hide-details="true"
          v-model="watcherSelected"
          :items="watchers"
          @update:modelValue="emitWatcherChanged"
          :clearable="true"
          label="Watcher"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-eye-outline"
        ></v-select>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select
          :hide-details="true"
          v-model="registrySelected"
          :items="registries"
          @update:modelValue="emitRegistryChanged"
          :clearable="true"
          label="Registry"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-database-outline"
        ></v-select>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select
          :hide-details="true"
          v-model="updateKindSelected"
          :items="updateKinds"
          @update:modelValue="emitUpdateKindChanged"
          :clearable="true"
          label="Update kind"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-tag-outline"
        ></v-select>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-autocomplete
          label="Group by label"
          :items="groupLabels"
          v-model="groupByLabelLocal"
          @update:modelValue="emitGroupByLabelChanged"
          clearable
          variant="outlined"
          density="compact"
          :hide-details="true"
          prepend-inner-icon="mdi-label-multiple-outline"
        ></v-autocomplete>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts">
import { refreshAllContainers } from "@/services/container";
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    totalCount: {
      type: Number,
      required: false,
    },
    filteredCount: {
      type: Number,
      required: false,
    },
    registries: {
      type: Array,
      required: true,
    },
    registrySelectedInit: {
      type: String,
      required: true,
    },
    watchers: {
      type: Array,
      required: true,
    },
    watcherSelectedInit: {
      type: String,
      required: true,
    },
    updateKinds: {
      type: Array,
      required: true,
    },
    updateKindSelectedInit: {
      type: String,
      required: true,
    },
    updateAvailable: {
      type: Boolean,
      required: true,
    },
    oldestFirst: {
      type: Boolean,
      required: true,
    },
    groupLabels: {
      type: Array,
      required: true,
    },
    groupByLabel: {
      type: String,
      required: false,
    },
  },

  data() {
    return {
      isRefreshing: false,
      registrySelected: "",
      watcherSelected: "",
      updateKindSelected: "",
      updateAvailableLocal: this.updateAvailable,
      oldestFirstLocal: this.oldestFirst,
      groupByLabelLocal: this.groupByLabel,
    };
  },

  computed: {
    hasActiveFilters(): boolean {
      return Boolean(
        this.registrySelected ||
        this.watcherSelected ||
        this.updateKindSelected ||
        this.groupByLabelLocal ||
        this.updateAvailableLocal ||
        this.oldestFirstLocal
      );
    },
  },

  methods: {
    emitRegistryChanged() {
      this.$emit("registry-changed", this.registrySelected ?? "");
    },
    emitWatcherChanged() {
      this.$emit("watcher-changed", this.watcherSelected ?? "");
    },
    emitUpdateKindChanged() {
      this.$emit("update-kind-changed", this.updateKindSelected ?? "");
    },
    emitUpdateAvailableChanged() {
      this.$emit("update-available-changed");
    },
    emitOldestFirstChanged() {
      this.$emit("oldest-first-changed");
    },
    emitGroupByLabelChanged(newLabel: string) {
      this.$emit("group-by-label-changed", newLabel ?? "");
    },
    resetFilters() {
      this.registrySelected = "";
      this.watcherSelected = "";
      this.updateKindSelected = "";
      this.groupByLabelLocal = "";
      this.updateAvailableLocal = false;
      this.oldestFirstLocal = false;
      this.emitRegistryChanged();
      this.emitWatcherChanged();
      this.emitUpdateKindChanged();
      this.emitGroupByLabelChanged("");
      this.$emit("reset-filters");
    },
    async refreshAllContainers() {
      this.isRefreshing = true;
      try {
        const body = await refreshAllContainers();
        (this as any).$eventBus.emit("notify", "All containers refreshed");
        this.$emit("refresh-all-containers", body);
      } catch (e: any) {
        (this as any).$eventBus.emit(
          "notify",
          `Error when trying to refresh all containers (${e.message})`,
          "error",
        );
      } finally {
        this.isRefreshing = false;
      }
    },
  },

  async beforeUpdate() {
    this.registrySelected = this.registrySelectedInit;
    this.watcherSelected = this.watcherSelectedInit;
    this.updateKindSelected = this.updateKindSelectedInit;
    this.updateAvailableLocal = this.updateAvailable;
    this.oldestFirstLocal = this.oldestFirst;
    this.groupByLabelLocal = this.groupByLabel;
  },
});
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
.switch-compact {
  display: inline-flex;
  align-items: center;
}
:deep(.v-switch .v-selection-control) {
  min-height: auto;
}
:deep(.v-switch .v-label) {
  font-size: 0.8125rem;
}
</style>
