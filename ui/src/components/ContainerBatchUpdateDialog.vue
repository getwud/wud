<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="620"
  >
    <v-card class="rounded-lg">
      <v-toolbar color="primary" density="compact" class="px-2">
        <v-icon class="mr-2">mdi-package-down</v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Update {{ containers.length }} {{ containers.length === 1 ? 'container' : 'containers' }}
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
        <v-alert
          v-if="containers.length > 1 && stacks.length > 0"
          type="info"
          variant="tonal"
          density="compact"
          icon="mdi-layers-outline"
          class="mb-3 text-caption"
        >
          Containers in the same stack are handed to the trigger together, so a compose
          stack is rewritten and recreated only once.
        </v-alert>

        <v-list density="compact" class="rounded border py-0 batch-update-list">
          <v-list-item
            v-for="container in containers"
            :key="container.id"
            class="px-3"
          >
            <template #prepend>
              <IconRenderer
                :icon="container.displayIcon || 'mdi:docker'"
                :size="20"
                :margin-right="12"
              />
            </template>
            <div class="d-flex align-center justify-space-between flex-wrap" style="gap: 8px">
              <div class="batch-update-item-main">
                <div class="text-body-2 font-weight-medium">
                  {{ container.displayName || container.name }}
                  <v-chip
                    v-if="container.stack"
                    label
                    size="x-small"
                    variant="tonal"
                    color="secondary"
                    class="ml-1"
                  >
                    {{ container.stack }}
                  </v-chip>
                </div>
                <div class="text-caption text-grey">
                  {{ container.image?.name || container.image?.path || '' }}
                </div>
              </div>
              <div class="d-flex align-center" style="gap: 6px">
                <v-chip label size="x-small" variant="outlined" color="info">
                  {{ currentVersion(container) }}
                </v-chip>
                <v-icon size="x-small" color="primary">mdi-arrow-right</v-icon>
                <v-chip label size="x-small" variant="flat" color="primary">
                  {{ newVersion(container) }}
                </v-chip>
              </div>
            </div>
          </v-list-item>
        </v-list>

        <v-alert
          v-if="hasCoolingDown"
          type="info"
          variant="tonal"
          density="compact"
          icon="mdi-timer-sand"
          class="mt-3 text-caption"
        >
          Some containers are in cool-down. Updating now overrides the cool-down period for them.
        </v-alert>

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
          No update trigger (docker, dockercompose, command, nomad) is configured for all the
          selected containers. Select containers that share a trigger, or update them one by one.
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
          :disabled="!selectedTrigger || isUpdating || triggers.length === 0 || containers.length === 0"
          :prepend-icon="hasCoolingDown ? 'mdi-lightning-bolt' : 'mdi-package-down'"
          @click="confirmUpdate"
        >
          {{ hasCoolingDown ? 'Update now' : 'Update' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, inject, PropType } from "vue";
import { getContainerTriggers, runTriggerBatch } from "@/services/container";
import IconRenderer from "@/components/IconRenderer.vue";
import {
  UPDATER_TRIGGER_TYPES,
  PULL_BASED_TRIGGER_TYPES,
} from "@/components/ContainerUpdateDialog.vue";

interface ContainerTriggerItem {
  id?: string;
  type: string;
  name: string;
  configuration?: Record<string, unknown>;
}

interface BatchContainer {
  id: string;
  name?: string;
  displayName?: string;
  displayIcon?: string;
  stack?: string;
  image?: {
    name?: string;
    path?: string;
    tag?: { value?: string };
    created?: string;
    upstream?: unknown;
  };
  updateKind?: {
    kind?: string;
    localValue?: string;
    remoteValue?: string;
  };
  result?: {
    created?: string;
    tag?: string;
    digest?: string;
  };
  isCoolingDown?: boolean;
}

type Filters = {
  short?: (v: string, l: number) => string;
  dateTime?: (d: string) => string;
};

export default defineComponent({
  name: "ContainerBatchUpdateDialog",
  components: { IconRenderer },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    containers: {
      type: Array as PropType<BatchContainer[]>,
      required: true,
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
    stacks(): string[] {
      return [...new Set(this.containers.map((c) => c.stack).filter(Boolean))] as string[];
    },
    hasCoolingDown(): boolean {
      return this.containers.some((c) => c.isCoolingDown);
    },
    hasUpstreamTracked(): boolean {
      return this.containers.some((c) => Boolean(c.image?.upstream));
    },
    singleTriggerLabel(): string {
      if (this.triggers.length !== 1) return "";
      const t = this.triggers[0];
      return `${t.type} (${t.name})`;
    },
    triggerOptions(): Array<{ title: string; value: string; trigger: ContainerTriggerItem }> {
      return this.triggers.map((t) => ({
        title: `${t.type} (${t.name})`,
        value: `${t.type}.${t.name}`,
        trigger: t,
      }));
    },
    selectedTrigger(): ContainerTriggerItem | undefined {
      if (!this.selectedTriggerKey) return undefined;
      return this.triggers.find((t) => `${t.type}.${t.name}` === this.selectedTriggerKey);
    },
  },
  watch: {
    async modelValue(val: boolean) {
      if (val) {
        await this.loadTriggers();
      }
    },
  },
  async mounted() {
    if (this.modelValue && this.containers.length > 0) {
      await this.loadTriggers();
    }
  },
  methods: {
    filters(): Filters {
      return ((this as unknown as { $filters?: Filters }).$filters) || {};
    },
    currentVersion(container: BatchContainer): string {
      if (container.image?.tag?.value) return container.image.tag.value;
      const local = container.updateKind?.localValue;
      if (local) {
        if (container.updateKind?.kind === "digest") {
          const short = this.filters().short;
          return short ? short(local, 15) : local.substring(0, 15);
        }
        return local;
      }
      return "unknown";
    },
    newVersion(container: BatchContainer): string {
      let version = "unknown";
      if (container.result?.created && container.image?.created !== container.result.created) {
        const dateTime = this.filters().dateTime;
        version = dateTime ? dateTime(container.result.created) : container.result.created;
      }
      if (container.result?.tag) version = container.result.tag;
      if (container.updateKind?.remoteValue) version = container.updateKind.remoteValue;
      if (
        container.updateKind?.kind === "digest" ||
        (!container.result?.tag && container.result?.digest)
      ) {
        const digest = container.updateKind?.remoteValue || container.result?.digest || version;
        const short = this.filters().short;
        version = short ? short(digest, 15) : digest.substring(0, 15);
      }
      return version;
    },
    isUpdaterTrigger(trigger: ContainerTriggerItem): boolean {
      return (
        UPDATER_TRIGGER_TYPES.includes(trigger.type) &&
        (!this.hasUpstreamTracked || !PULL_BASED_TRIGGER_TYPES.includes(trigger.type))
      );
    },
    selectDefaultTrigger() {
      if (this.triggers.length === 0) {
        this.selectedTriggerKey = null;
        return;
      }
      const preferred =
        this.triggers.find((t) => t.type === "dockercompose") ||
        this.triggers.find((t) => t.type === "docker") ||
        this.triggers[0];
      this.selectedTriggerKey = `${preferred.type}.${preferred.name}`;
    },
    /**
     * Only triggers associated with every selected container can run the batch.
     */
    async loadTriggers() {
      if (this.containers.length === 0) {
        this.triggers = [];
        this.selectedTriggerKey = null;
        return;
      }
      this.loadingTriggers = true;
      try {
        const perContainer = await Promise.all(
          this.containers.map(async (c) => ((await getContainerTriggers(c.id)) || []) as ContainerTriggerItem[]),
        );
        const keyOf = (t: ContainerTriggerItem) => `${t.type}.${t.name}`;
        const [first, ...rest] = perContainer;
        this.triggers = first
          .filter((t) => this.isUpdaterTrigger(t))
          .filter((t) => rest.every((list) => list.some((o) => keyOf(o) === keyOf(t))));
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
    notify(message: string, level?: string) {
      const bus =
        this.eventBus ||
        (this as unknown as { $eventBus?: { emit: (e: string, ...a: unknown[]) => void } }).$eventBus;
      if (level) {
        bus?.emit("notify", message, level);
      } else {
        bus?.emit("notify", message);
      }
    },
    async confirmUpdate() {
      if (!this.selectedTrigger || this.containers.length === 0) return;
      this.isUpdating = true;
      try {
        await runTriggerBatch({
          containerIds: this.containers.map((c) => c.id),
          triggerType: this.selectedTrigger.type,
          triggerName: this.selectedTrigger.name,
          ...(this.hasCoolingDown ? { overrideCooldown: true } : {}),
        });
        this.notify(`Update triggered successfully for ${this.containers.length} containers`);
        this.$emit("updated", this.selectedTrigger);
        this.close();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.notify(`Update triggered with error (${errorMessage})`, "error");
      } finally {
        this.isUpdating = false;
      }
    },
  },
});
</script>

<style scoped>
.batch-update-list {
  max-height: 320px;
  overflow-y: auto;
}

.batch-update-item-main {
  min-width: 0;
}
</style>
