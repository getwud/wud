<template>
  <v-container fluid>
    <div v-if="loading" class="text-center py-4">
      <v-progress-circular
        indeterminate
        color="primary"
        size="24"
        class="mr-2"
      />
      <span class="text-caption text-grey">Loading triggers...</span>
    </div>
    <v-row v-else-if="triggers && triggers.length > 0">
      <v-col v-for="trigger in triggers" :key="trigger.id" lg="6" sm="12">
        <container-trigger
          :trigger="trigger"
          :update-available="container.updateAvailable"
          :container-id="container.id"
        />
      </v-col>
    </v-row>
    <v-card-text v-else> No triggers associated to the container </v-card-text>
  </v-container>
</template>

<script lang="ts">
import ContainerTrigger from "@/components/ContainerTrigger.vue";
import { getContainerTriggers } from "@/services/container";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    ContainerTrigger,
  },
  props: {
    container: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      triggers: [] as any[],
      loading: false,
    };
  },

  watch: {
    "container.id": {
      async handler(newId?: string, oldId?: string) {
        if (newId && newId !== oldId) {
          await this.fetchTriggers();
        } else if (!newId) {
          this.triggers = [];
        }
      },
    },
  },

  async created() {
    if (this.container?.id) {
      await this.fetchTriggers();
    }
  },

  methods: {
    async fetchTriggers() {
      if (!this.container?.id) {
        this.triggers = [];
        return;
      }
      this.loading = true;
      try {
        const triggers = await getContainerTriggers(this.container.id);
        this.triggers = triggers || [];
      } catch (e) {
        this.triggers = [];
      } finally {
        this.loading = false;
      }
    },
  },
});
</script>
