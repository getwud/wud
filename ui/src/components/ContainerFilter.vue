<template>
  <v-container fluid class="ma-0 mb-3 pa-md-0">
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
        >
        </v-autocomplete>
      </v-col>
      <v-col cols="6" sm="6" md="3">
        <v-switch
          class="switch-top"
          label="Update available"
          v-model="updateAvailableLocal"
          @update:modelValue="emitUpdateAvailableChanged"
          :hide-details="true"
          density="compact"
        />
      </v-col>
      <v-col cols="6" sm="6" md="3">
        <v-switch
          class="switch-top"
          label="Oldest first"
          v-model="oldestFirstLocal"
          @update:modelValue="emitOldestFirstChanged"
          :hide-details="true"
          density="compact"
        />
      </v-col>
      <v-col cols="12" sm="12" md="6" class="d-flex justify-center justify-md-end">
        <v-btn
          color="secondary"
          @click.stop="refreshAllContainers"
          :loading="isRefreshing"
        >
          Watch now
          <v-icon> mdi-refresh</v-icon>
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { refreshAllContainers } from "@/services/container";
import { defineComponent } from "vue";

export default defineComponent({
  props: {
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
.switch-top {
  margin-top: 4px;
}
</style>
