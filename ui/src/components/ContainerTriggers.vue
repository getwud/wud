<template>
  <v-container fluid>
    <v-row v-if="triggers.length > 0">
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
    };
  },

  async created() {
    this.triggers = await getContainerTriggers(this.container.id);
  },
});
</script>
