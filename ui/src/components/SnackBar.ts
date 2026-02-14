import { defineComponent } from "vue";

export default defineComponent({
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    timeout: {
      type: Number,
      default: 4000,
    },
    message: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      default: "info",
    },
  },

  computed: {
    showLocal: {
      get() {
        return this.show;
      },
      set(value: boolean) {
        if (!value) {
          this.closeSnackbar();
        }
      }
    }
  },

  methods: {
    closeSnackbar() {
      (this as any).$eventBus.emit("notify:close");
    },
  },
});
