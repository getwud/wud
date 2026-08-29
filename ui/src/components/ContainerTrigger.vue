<template>
  <v-card variant="outlined">
    <v-list-item>
      <template v-slot:prepend>
        <v-icon>mdi-bell-ring</v-icon>
      </template>
      <v-list-item-title class="text-capitalize">
        <router-link to="/configuration/triggers">
          {{ trigger.type }} {{ trigger.name }}
        </router-link>
      </v-list-item-title>
      <v-list-item-subtitle>
        (threshold {{ trigger.configuration.threshold }})
      </v-list-item-subtitle>
      <template v-slot:append>
        <v-btn
          variant="outlined"
          color="accent"
          :disabled="!updateAvailable"
          @click="runTrigger"
          :loading="isTriggering"
        >
          Run
          <v-icon end>mdi-gesture-tap</v-icon>
        </v-btn>
      </template>
    </v-list-item>
  </v-card>
</template>

<script lang="ts">
import { runTrigger } from "@/services/container";
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    trigger: {
      type: Object,
      required: true,
    },
    updateAvailable: {
      type: Boolean,
      required: true,
    },
    containerId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      isTriggering: false,
    };
  },
  computed: {},

  methods: {
    async runTrigger() {
      this.isTriggering = true;
      try {
        await runTrigger({
          containerId: this.containerId,
          triggerType: this.trigger.type,
          triggerName: this.trigger.name,
        });
        (this as any).$eventBus.emit("notify", "Trigger executed with success");
      } catch (err: any) {
        (this as any).$eventBus.emit(
          "notify",
          `Trigger executed with error (${err.message}})`,
          "error",
        );
      } finally {
        this.isTriggering = false;
      }
      this.isTriggering = false;
    },
  },
});
</script>
