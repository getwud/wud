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
