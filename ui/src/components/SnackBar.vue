<template>
  <v-snackbar
    v-model="showLocal"
    :timeout="timeout"
    :color="color"
    location="top right"
    variant="flat"
    elevation="4"
    rounded="lg"
    class="toast-notification"
  >
    <div class="d-flex align-center pr-2">
      <v-icon class="mr-3 flex-shrink-0" size="22">
        {{ icon }}
      </v-icon>
      <span class="text-body-2 font-weight-medium text-wrap message-content">
        {{ message }}
      </span>
    </div>

    <template v-slot:actions>
      <v-btn
        variant="text"
        size="small"
        density="comfortable"
        aria-label="Close"
        class="close-button"
        @click="closeSnackbar"
      >
        <v-icon size="18">mdi-close</v-icon>
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "SnackBar",

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
    color(): string {
      switch (this.level?.toLowerCase()) {
        case "error":
          return "error";
        case "warning":
          return "warning";
        case "success":
          return "success";
        case "info":
        default:
          return "info";
      }
    },

    icon(): string {
      switch (this.level?.toLowerCase()) {
        case "error":
          return "mdi-alert-circle";
        case "warning":
          return "mdi-alert";
        case "success":
          return "mdi-check-circle";
        case "info":
        default:
          return "mdi-information";
      }
    },

    showLocal: {
      get(): boolean {
        return this.show;
      },
      set(value: boolean) {
        if (!value) {
          this.closeSnackbar();
        }
      },
    },
  },

  methods: {
    closeSnackbar() {
      (this as any).$eventBus.emit("notify:close");
    },
  },
});
</script>

<style scoped>
.message-content {
  line-height: 1.4;
  word-break: break-word;
}

.close-button {
  opacity: 0.85;
  transition: opacity 0.2s ease;
}

.close-button:hover {
  opacity: 1;
}
</style>

