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

        <v-text-field
          label="Container ID"
          v-model="container.id"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
        />

        <v-text-field
          label="Container Name"
          v-model="container.name"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
        />

        <v-text-field
          label="Container Watcher"
          v-model="container.watcher"
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
          v-model="container.updateKind.result.link"
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
      container: {
        id: "123456789",
        name: "container_test",
        watcher: "watcher_test",
        updateKind: {
          kind: "tag",
          semverDiff: "major",
          localValue: "1.2.3",
          remoteValue: "4.5.6",
          result: {
            link: "https://my-container/release-notes/",
          },
        },
      },
    };
  },
  methods: {
    close() {
      this.$emit("update:modelValue", false);
    },
    async executeTrigger() {
      if (!this.trigger) return;
      this.isTriggering = true;
      try {
        await runTrigger({
          triggerType: this.trigger.type,
          triggerName: this.trigger.name,
          container: this.container,
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
