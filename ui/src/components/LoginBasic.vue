<template>
  <v-form @submit.prevent="login">
    <div class="py-2">
      <v-text-field
        v-model="username"
        label="Username"
        prepend-inner-icon="mdi-account-outline"
        :rules="[rules.required]"
        autocomplete="username"
        variant="outlined"
        density="comfortable"
        rounded="lg"
        autofocus
        class="mb-2"
        :error-messages="errorMessage ? [errorMessage] : []"
        @input="errorMessage = ''"
      />

      <v-text-field
        v-model="password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
        :rules="[rules.required]"
        autocomplete="current-password"
        variant="outlined"
        density="comfortable"
        rounded="lg"
        class="mb-4"
        @click:append-inner="showPassword = !showPassword"
        @input="errorMessage = ''"
      />

      <v-btn
        block
        color="primary"
        size="large"
        rounded="lg"
        variant="flat"
        :disabled="!valid"
        :loading="loading"
        class="font-weight-bold text-none"
        prepend-icon="mdi-login"
        type="submit"
      >
        Login
      </v-btn>
    </div>
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
      showPassword: false,
      loading: false,
      errorMessage: "",
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
        this.loading = true;
        this.errorMessage = "";
        try {
          await loginBasic(this.username, this.password);
          this.$emit("authentication-success");
        } catch (e: any) {
          this.errorMessage = "Invalid username or password";
          (this as any).$eventBus?.emit(
            "notify",
            "Username or password error",
            "error",
          );
        } finally {
          this.loading = false;
        }
      }
    },
  },
});
</script>
