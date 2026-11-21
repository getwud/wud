<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="520"
  >
    <v-card class="rounded-lg">
      <v-toolbar color="surface" density="compact" class="border-b px-2">
        <v-icon color="primary" class="mr-2">mdi-test-tube</v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Test Trigger
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="close"></v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <div class="text-caption text-grey mb-3">
          Simulate a container update notification for
          <strong class="text-high-emphasis">{{ trigger?.type }} / {{ trigger?.name }}</strong>.
        </div>

        <v-autocomplete
          label="Source Container"
          v-model="selectedContainerId"
          :items="containerOptions"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="mb-3"
        />

        <v-text-field
          label="Container ID"
          v-model="container.id"
          :disabled="!!selectedContainerId"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
        />

        <v-text-field
          label="Container Name"
          v-model="container.name"
          :disabled="!!selectedContainerId"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
        />

        <v-text-field
          label="Container Watcher"
          v-model="container.watcher"
          :disabled="!!selectedContainerId"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
        />

        <v-select
          label="Update Kind"
          v-model="container.updateKind.kind"
          :items="['digest', 'tag']"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
        />

        <v-select
          v-if="container.updateKind.kind === 'tag'"
          label="Update Semver Diff"
          v-model="container.updateKind.semverDiff"
          :items="['major', 'minor', 'patch']"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
        />

        <v-text-field
          label="Local Value"
          v-model="container.updateKind.localValue"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
        />

        <v-text-field
          label="Remote Value"
          v-model="container.updateKind.remoteValue"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
        />

        <v-text-field
          label="Release Notes / Result Link"
          v-model="container.result.link"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3 justify-end bg-surface">
        <v-btn variant="outlined" size="small" @click="close">
          Cancel
        </v-btn>
        <v-btn
          variant="flat"
          color="primary"
          size="small"
          @click="executeTrigger"
          :loading="isTriggering"
          prepend-icon="mdi-play"
        >
          Run Trigger
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { getAllContainers } from "@/services/container";
import { runTrigger } from "@/services/trigger";
import { defineComponent } from "vue";

export default defineComponent({
  name: "TriggerTestDialog",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    trigger: {
      type: Object,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  data() {
    return {
      isTriggering: false,
      containers: [] as any[],
      selectedContainerId: null as string | null,
      container: {
        id: "123456789",
        name: "container_test",
        watcher: "watcher_test",
        stack: "test-stack",
        updateKind: {
          kind: "tag",
          semverDiff: "major",
          localValue: "1.2.3",
          remoteValue: "4.5.6",
        },
        result: {
          tag: "4.5.6",
          digest: "",
          link: "https://my-container/release-notes/",
        },
      },
    };
  },
  computed: {
    containerOptions(): any[] {
      const mockOption = {
        title: "Mock Container (Sample data)",
        value: null,
      };
      const realOptions = (this.containers || []).map((c: any) => ({
        title: `${c.name} (${c.watcher})`,
        value: c.id,
      }));
      return [mockOption, ...realOptions];
    },
  },
  watch: {
    async modelValue(val: boolean) {
      if (val) {
        await this.loadContainers();
      }
    },
    selectedContainerId(newId: string | null) {
      if (newId) {
        const selected = (this.containers || []).find((c: any) => c.id === newId);
        if (selected) {
          this.container.id = selected.id;
          this.container.name = selected.name;
          this.container.watcher = selected.watcher;
          if (selected.image?.tag?.value) {
            this.container.updateKind.localValue = selected.image.tag.value;
          }
        }
      } else {
        this.container.id = "123456789";
        this.container.name = "container_test";
        this.container.watcher = "watcher_test";
        this.container.updateKind.localValue = "1.2.3";
      }
    },
  },
  async mounted() {
    await this.loadContainers();
  },
  methods: {
    async loadContainers() {
      try {
        this.containers = (await getAllContainers()) || [];
      } catch {
        this.containers = [];
      }
    },
    close() {
      this.$emit("update:modelValue", false);
    },
    sanitizeImage(image: any): Record<string, any> | undefined {
      if (!image || typeof image !== "object") {
        return undefined;
      }
      const sanitized: Record<string, any> = {};
      if (typeof image.id === "string") sanitized.id = image.id;
      if (typeof image.name === "string") sanitized.name = image.name;
      if (image.registry && typeof image.registry === "object") {
        const registry: Record<string, any> = {};
        if (typeof image.registry.name === "string") registry.name = image.registry.name;
        if (typeof image.registry.url === "string") registry.url = image.registry.url;
        if (Object.keys(registry).length > 0) sanitized.registry = registry;
      }
      if (image.tag && typeof image.tag === "object") {
        const tag: Record<string, any> = {};
        if (typeof image.tag.value === "string") tag.value = image.tag.value;
        if (typeof image.tag.semver === "boolean") tag.semver = image.tag.semver;
        if (Object.keys(tag).length > 0) sanitized.tag = tag;
      }
      if (image.digest && typeof image.digest === "object") {
        const digest: Record<string, any> = {};
        if (typeof image.digest.watch === "boolean") digest.watch = image.digest.watch;
        if (typeof image.digest.value === "string") digest.value = image.digest.value;
        if (typeof image.digest.repo === "string") digest.repo = image.digest.repo;
        if (Object.keys(digest).length > 0) sanitized.digest = digest;
      }
      if (typeof image.architecture === "string") sanitized.architecture = image.architecture;
      if (typeof image.os === "string") sanitized.os = image.os;
      if (typeof image.variant === "string") sanitized.variant = image.variant;
      if (typeof image.created === "string") sanitized.created = image.created;
      if (typeof image.version === "string" || image.version === null) {
        sanitized.version = image.version;
      }
      return Object.keys(sanitized).length > 0 ? sanitized : undefined;
    },
    async executeTrigger() {
      if (!this.trigger) return;
      this.isTriggering = true;
      try {
        const result: Record<string, any> = {
          link: this.container.result.link,
        };
        if (this.container.updateKind.kind === "tag") {
          result.tag = this.container.updateKind.remoteValue;
        } else if (this.container.updateKind.kind === "digest") {
          result.digest = this.container.updateKind.remoteValue;
        }

        const updateKind: Record<string, any> = {
          kind: this.container.updateKind.kind,
          localValue: this.container.updateKind.localValue,
          remoteValue: this.container.updateKind.remoteValue,
        };
        if (this.container.updateKind.kind === "tag") {
          updateKind.semverDiff = this.container.updateKind.semverDiff;
        }

        const payload: Record<string, any> = {
          id: this.container.id,
          name: this.container.name,
          watcher: this.container.watcher,
          updateAvailable: true,
          updateKind,
          result,
        };

        if (this.selectedContainerId) {
          const selectedContainer = (this.containers || []).find(
            (c: any) => c.id === this.selectedContainerId,
          );
          if (selectedContainer) {
            if (typeof selectedContainer.displayName === "string") {
              payload.displayName = selectedContainer.displayName;
            }
            if (typeof selectedContainer.stack === "string") {
              payload.stack = selectedContainer.stack;
            }
            const sanitizedImage = this.sanitizeImage(selectedContainer.image);
            if (sanitizedImage) {
              payload.image = sanitizedImage;
            }
          }
        } else if (this.container.stack) {
          payload.stack = this.container.stack;
        }

        await runTrigger({
          triggerType: this.trigger.type,
          triggerName: this.trigger.name,
          container: payload,
        });
        (this as any).$eventBus?.emit("notify", "Trigger executed with success");
        this.close();
      } catch (err: any) {
        (this as any).$eventBus?.emit(
          "notify",
          `Trigger executed with error (${err.message})`,
          "error",
        );
      } finally {
        this.isTriggering = false;
      }
    },
  },
});
</script>
