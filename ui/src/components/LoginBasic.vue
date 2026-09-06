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
        :rules="[rules.required]"
        autocomplete="current-password"
        variant="outlined"
        density="comfortable"
        rounded="lg"
        class="mb-4"
        @input="errorMessage = ''"
      >
        <template #append-inner>
          <v-icon
            :icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            aria-label="Toggle password visibility"
            role="button"
            tabindex="0"
            @click="showPassword = !showPassword"
          />
        </template>
      </v-text-field>

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

      <!-- Demo Mode Quick Login Helpers -->
      <div v-if="isDemo" class="mt-4 pt-3 border-t">
        <div class="d-flex align-center text-caption font-weight-bold text-medium-emphasis mb-2">
          <v-icon size="small" class="mr-1 text-primary">mdi-lightning-bolt</v-icon>
          Demo Quick Sign-In:
        </div>
        <div class="d-flex flex-column gap-2">
          <v-btn
            size="small"
            variant="tonal"
            color="error"
            class="text-none justify-start mb-1"
            prepend-icon="mdi-shield-crown-outline"
            @click="quickLogin('homelab-admin')"
          >
            Admin <span class="text-medium-emphasis ml-1 font-weight-regular">(homelab-admin)</span>
          </v-btn>
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            class="text-none justify-start mb-1"
            prepend-icon="mdi-pencil-outline"
            @click="quickLogin('developer')"
          >
            Read / Write <span class="text-medium-emphasis ml-1 font-weight-regular">(developer)</span>
          </v-btn>
          <v-btn
            size="small"
            variant="tonal"
            color="grey-darken-1"
            class="text-none justify-start mb-1"
            prepend-icon="mdi-eye-outline"
            @click="quickLogin('viewer-oidc')"
          >
            Read-Only <span class="text-medium-emphasis ml-1 font-weight-regular">(viewer-oidc)</span>
          </v-btn>
        </div>
        <div class="text-caption text-grey mt-2 text-center">
          Any password accepted in demo mode.
        </div>
      </div>
    </div>
  </v-form>
</template>

<script lang="ts">
import { loginBasic } from "@/services/auth";
import { isDemoMode } from "@/services/mock";
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      username: "",
      password: "",
      showPassword: false,
      loading: false,
      errorMessage: "",
      isDemo: isDemoMode(),
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

  mounted() {
    if (this.isDemo && !this.username) {
      this.username = "homelab-admin";
      this.password = "demo";
    }
  },

  methods: {
    /**
     * Quick login helper for demo mode.
     */
    quickLogin(demoUsername: string) {
      this.username = demoUsername;
      this.password = "demo";
      this.login();
    },

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
