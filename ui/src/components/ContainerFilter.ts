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
