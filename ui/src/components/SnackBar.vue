<template>
  <v-snackbar
    :value="show"
    :timeout="computedTimeout"
    :color="computedColor"
    @input="closeSnackbar"
    outlined
  >
    {{ message }}
    <template v-slot:action="{ attrs }">
      <v-btn text v-bind="attrs" @click="closeSnackbar">Close</v-btn>
    </template>
  </v-snackbar>
</template>

<script>
export default {
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    timeout: {
      type: Number,
      default: 2000,
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
    computedColor() {
      switch (this.level) {
        case "success":
          return "green";
        case "warning":
          return "orange";
        case "error":
          return "red";
        default:
          return "primary";
      }
    },
    computedTimeout() {
      return this.level === "error" ? 0 : this.timeout;
    },
  },
  methods: {
    closeSnackbar() {
      this.$root.$emit("notify:close");
    },
  },
};
</script>
