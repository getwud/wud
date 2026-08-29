<template>
  <v-form @keyup.enter="login">
    <v-card-text>
      <v-text-field
        label="Username"
        v-model="username"
        append-icon="mdi-account"
        :rules="[rules.required]"
        autocomplete="username"
        variant="outlined"
        autofocus
      />
      <v-text-field
        label="Password"
        type="password"
        v-model="password"
        append-icon="mdi-lock"
        :rules="[rules.required]"
        autocomplete="current-password"
        variant="outlined"
      />
      <v-btn block color="primary" :disabled="!valid" @click="login">
        Login
      </v-btn>
    </v-card-text>
  </v-form>
</template>

<script lang="ts">
import { loginBasic } from "@/services/auth";
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      username: "",
      password: "",
      rules: {
        required: (value: any) => !!value || "Required",
      },
    };
  },

  computed: {
    /**
     * Is form valid?
     * @returns {boolean}
     */
    valid() {
      return this.username !== "" && this.password !== "";
    },
  },

  methods: {
    /**
     * Perform login.
     * @returns {Promise<void>}
     */
    async login() {
      if (this.valid) {
        try {
          await loginBasic(this.username, this.password);
          this.$emit("authentication-success");
        } catch (e) {
          (this as any).$eventBus.emit("notify", "Username or password error", "error");
        }
      }
    },
  },
});
</script>
