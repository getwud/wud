<template>
  <v-snackbar
    :value="show"
    :timeout="timeout"
    color="primary"
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

  methods: {
    closeSnackbar() {
      this.$root.$emit("notify:close");
    },
  },
};
</script>
