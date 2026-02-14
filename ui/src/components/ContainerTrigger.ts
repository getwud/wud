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
