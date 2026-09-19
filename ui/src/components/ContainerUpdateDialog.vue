<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
  >
    <v-card class="rounded-lg">
      <v-toolbar color="primary" density="compact" class="px-2">
        <v-icon class="mr-2">mdi-package-down</v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Update container
        </v-toolbar-title>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :disabled="isUpdating"
          @click="close"
        />
      </v-toolbar>

      <v-card-text class="pa-4">
        <div class="mb-3">
          <div class="text-subtitle-1 font-weight-bold">
            {{ containerDisplayName }}
          </div>
          <div
            v-if="containerImageName"
            class="text-caption text-grey"
          >
            {{ containerImageName }}
          </div>
        </div>

        <div
          class="d-flex align-center justify-center my-3 py-3 px-3 rounded border bg-surface-light"
          style="gap: 16px"
        >
          <div class="text-center">
            <div class="text-caption text-grey mb-1">Current version</div>
            <v-chip label size="small" variant="outlined" color="info">
              {{ currentVersion }}
            </v-chip>
          </div>
          <v-icon color="primary" size="small">mdi-arrow-right</v-icon>
          <div class="text-center">
            <div class="text-caption text-grey mb-1">Available version</div>
            <v-chip label size="small" variant="flat" color="primary">
              {{ displayNewVersion }}
            </v-chip>
          </div>
        </div>

        <div v-if="loadingTriggers" class="text-center py-4">
          <v-progress-circular
            indeterminate
            color="primary"
            size="24"
            class="mr-2"
          />
          <span class="text-caption text-grey">Loading triggers...</span>
        </div>

        <v-alert
          v-else-if="triggers.length === 0"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-3 text-caption"
        >
          No update trigger (docker, dockercompose, command, nomad) is configured for this container.
        </v-alert>

        <div
          v-else-if="triggers.length === 1"
          class="mt-3 py-2 px-3 rounded border bg-surface-light d-flex align-center justify-space-between"
        >
          <div class="d-flex align-center">
            <v-icon color="primary" size="small" class="mr-2">mdi-cog-play-outline</v-icon>
            <div>
              <div class="text-caption text-grey">Target trigger</div>
              <div class="text-body-2 font-weight-medium">
                {{ singleTriggerLabel }}
              </div>
            </div>
          </div>
          <v-chip label size="small" variant="tonal" color="primary">
            {{ triggers[0].type }}
          </v-chip>
        </div>

        <v-select
          v-else
          label="Trigger to execute"
          v-model="selectedTriggerKey"
          :items="triggerOptions"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="compact"
          class="mt-3"
          hide-details
        />
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3 justify-end bg-surface">
        <v-btn
          variant="outlined"
          size="small"
          :disabled="isUpdating"
          @click="close"
        >
          Cancel
        </v-btn>
        <v-btn
          variant="flat"
          color="primary"
          size="small"
          :loading="isUpdating"
          :disabled="!selectedTrigger || isUpdating || triggers.length === 0"
          prepend-icon="mdi-package-down"
          @click="confirmUpdate"
        >
          Update
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, inject, PropType } from "vue";
import { getContainerTriggers, runTrigger } from "@/services/container";

export const UPDATER_TRIGGER_TYPES = ["docker", "dockercompose", "command", "nomad"];

interface TriggerConfig {
  threshold?: string;
  includebydefault?: boolean;
  [key: string]: unknown;
}

interface ContainerTriggerItem {
  id?: string;
  type: string;
  name: string;
  configuration?: TriggerConfig;
}

interface ContainerUpdateDialogProps {
  id?: string;
  name?: string;
  displayName?: string;
  watcher?: string;
  image?: {
    name?: string;
    path?: string;
    registry?: { name?: string };
    tag?: { value?: string };
    created?: string;
  };
  updateKind?: {
    kind?: string;
    localValue?: string;
    remoteValue?: string;
    semverDiff?: string;
  };
  result?: {
    created?: string;
    tag?: string;
    digest?: string;
  };
}

export default defineComponent({
  name: "ContainerUpdateDialog",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    container: {
      type: Object as PropType<ContainerUpdateDialogProps>,
      required: true,
    },
    newVersion: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue", "updated"],
  setup() {
    const eventBus = inject("eventBus", null) as {
      emit: (event: string, ...args: unknown[]) => void;
    } | null;
    return { eventBus };
  },
  data() {
    return {
      triggers: [] as ContainerTriggerItem[],
      selectedTriggerKey: null as string | null,
      loadingTriggers: false,
      isUpdating: false,
    };
  },
  computed: {
    containerDisplayName(): string {
      return this.container?.displayName || this.container?.name || "Unknown container";
    },
    containerImageName(): string {
      return this.container?.image?.name || this.container?.image?.path || "";
    },
    currentVersion(): string {
      if (!this.container) return "unknown";
      if (this.container.image?.tag?.value) {
        return this.container.image.tag.value;
      }
      if (this.container.updateKind?.localValue) {
        if (this.container.updateKind.kind === "digest") {
          const filters = (this as unknown as { $filters?: { short: (v: string, l: number) => string } }).$filters;
          return filters?.short
            ? filters.short(this.container.updateKind.localValue, 15)
            : this.container.updateKind.localValue.substring(0, 15);
        }
        return this.container.updateKind.localValue;
      }
      return "unknown";
    },
    displayNewVersion(): string {
      if (this.newVersion) {
        return this.newVersion;
      }
      if (!this.container) return "unknown";
      let version = "unknown";
      if (
        this.container.result?.created &&
        this.container.image?.created !== this.container.result?.created
      ) {
        const filters = (this as unknown as { $filters?: { dateTime: (d: string) => string } }).$filters;
        version = filters?.dateTime
          ? filters.dateTime(this.container.result.created)
          : this.container.result.created;
      }
      if (this.container.updateKind?.remoteValue) {
        version = this.container.updateKind.remoteValue;
      }
      if (this.container.updateKind?.kind === "digest") {
        const filters = (this as unknown as { $filters?: { short: (v: string, l: number) => string } }).$filters;
        version = filters?.short
          ? filters.short(version, 15)
          : version.substring(0, 15);
      }
      return version;
    },
    singleTriggerLabel(): string {
      if (this.triggers.length !== 1) return "";
      const t = this.triggers[0];
      return `${t.type} (${t.name})`;
    },
    triggerOptions(): Array<{ title: string; value: string; trigger: ContainerTriggerItem }> {
      return (this.triggers || []).map((t) => ({
        title: `${t.type} (${t.name})`,
        value: `${t.type}.${t.name}`,
        trigger: t,
      }));
    },
    selectedTrigger(): ContainerTriggerItem | undefined {
      if (!this.selectedTriggerKey) return undefined;
      return (this.triggers || []).find(
        (t) => `${t.type}.${t.name}` === this.selectedTriggerKey,
      );
    },
  },
  watch: {
    async modelValue(val: boolean) {
      if (val) {
        await this.loadTriggers();
      }
    },
    container: {
      async handler(newVal: ContainerUpdateDialogProps | undefined) {
        if (this.modelValue && newVal?.id) {
          await this.loadTriggers();
        }
      },
      deep: true,
    },
  },
  async mounted() {
    if (this.modelValue && this.container?.id) {
      await this.loadTriggers();
    }
  },
  methods: {
    selectDefaultTrigger() {
      if (!this.triggers || this.triggers.length === 0) {
        this.selectedTriggerKey = null;
        return;
      }
      const preferredTrigger = this.triggers.find(
        (t) => t.type === "docker" || t.type === "dockercompose",
      );
      if (preferredTrigger) {
        this.selectedTriggerKey = `${preferredTrigger.type}.${preferredTrigger.name}`;
      } else {
        this.selectedTriggerKey = `${this.triggers[0].type}.${this.triggers[0].name}`;
      }
    },
    async loadTriggers() {
      if (!this.container?.id) return;
      this.loadingTriggers = true;
      try {
        const rawTriggers = (await getContainerTriggers(this.container.id)) || [];
        this.triggers = rawTriggers.filter((t: ContainerTriggerItem) =>
          UPDATER_TRIGGER_TYPES.includes(t.type),
        );
        this.selectDefaultTrigger();
      } catch {
        this.triggers = [];
        this.selectedTriggerKey = null;
      } finally {
        this.loadingTriggers = false;
      }
    },
    close() {
      this.$emit("update:modelValue", false);
    },
    async confirmUpdate() {
      if (!this.selectedTrigger || !this.container?.id) return;
      this.isUpdating = true;
      try {
        await runTrigger({
          containerId: this.container.id,
          triggerType: this.selectedTrigger.type,
          triggerName: this.selectedTrigger.name,
        });
        const bus = this.eventBus || (this as unknown as { $eventBus?: { emit: (e: string, ...a: unknown[]) => void } }).$eventBus;
        bus?.emit(
          "notify",
          `Update triggered successfully for ${this.containerDisplayName}`,
        );
        this.$emit("updated", this.selectedTrigger);
        this.close();
      } catch (err: unknown) {
        const bus = this.eventBus || (this as unknown as { $eventBus?: { emit: (e: string, ...a: unknown[]) => void } }).$eventBus;
        const errorMessage = err instanceof Error ? err.message : String(err);
        bus?.emit(
          "notify",
          `Update triggered with error (${errorMessage})`,
          "error",
        );
      } finally {
        this.isUpdating = false;
      }
    },
  },
});
</script>
