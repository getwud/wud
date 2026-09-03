<template>
  <v-container class="fill-height d-flex align-center justify-center pa-4">
    <v-card
      class="login-card w-100 rounded-lg border bg-surface pa-6 pa-sm-8"
      max-width="440"
      elevation="1"
    >
      <!-- Header -->
      <div class="d-flex flex-column align-center text-center mb-6">
        <v-avatar color="primary" variant="tonal" size="64" class="mb-3 rounded-lg">
          <v-img :src="logo" max-width="40" max-height="40" alt="WUD logo" />
        </v-avatar>
        <h1 class="text-h5 font-weight-bold text-high-emphasis mb-1">
          What's Up Docker
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Sign in to access your container dashboard
        </p>
      </div>

      <!-- Multiple Strategies Tabs -->
      <v-tabs
        v-if="strategies.length > 1"
        v-model="strategySelected"
        color="primary"
        grow
        density="comfortable"
        class="mb-4 border-b"
      >
        <v-tab
          v-for="strategy in strategies"
          :key="strategy.name"
          :prepend-icon="strategy.type === 'oidc' ? 'mdi-openid' : 'mdi-account-key-outline'"
          class="text-none font-weight-medium"
        >
          {{ formatStrategyName(strategy) }}
        </v-tab>
      </v-tabs>

      <!-- Strategy Content -->
      <v-window v-model="strategySelected">
        <v-window-item
          v-for="strategy in strategies"
          :key="strategy.type + strategy.name"
        >
          <login-basic
            v-if="strategy.type === 'basic'"
            @authentication-success="onAuthenticationSuccess"
          />
          <login-oidc
            v-if="strategy.type === 'oidc'"
            :name="strategy.name"
            @authentication-success="onAuthenticationSuccess"
          />
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { inject, defineComponent } from "vue";
import { getOidcRedirection, getStrategies } from "@/services/auth";
import LoginBasic from "@/components/LoginBasic.vue";
import LoginOidc from "@/components/LoginOidc.vue";
import logo from "@/assets/wud-logo.svg";

export default defineComponent({
  components: {
    LoginBasic,
    LoginOidc,
  },
  setup() {
    const eventBus = inject("eventBus") as any;
    return {
      eventBus,
    };
  },
  data() {
    return {
      logo,
      strategies: [] as any[],
      strategySelected: 0,
    };
  },

  methods: {
    /**
     * Format display label for strategy tab.
     */
    formatStrategyName(strategy: any) {
      if (strategy.type === "basic") {
        return strategy.name === "Login" ? "Credentials" : strategy.name;
      }
      return strategy.name
        ? strategy.name.charAt(0).toUpperCase() + strategy.name.slice(1)
        : "OIDC";
    },

    /**
     * Is strategy supported for Web UI usage?
     * @param strategy
     * @returns {boolean}
     */
    isSupportedStrategy(strategy: any) {
      switch (strategy.type) {
        case "basic":
          return true;
        case "oidc":
          return true;
        default:
          return false;
      }
    },

    /**
     * Handle authentication success.
     */
    onAuthenticationSuccess() {
      this.$router.push((this.$route.query.next as string) || "/");
    },
  },

  /**
   * Collect available auth strategies.
   * @param to
   * @param from
   * @param next
   * @returns {Promise<void>}
   */
  async beforeRouteEnter(to: any, from: any, next: any) {
    try {
      const strategies = await getStrategies();

      // If anonymous auth is enabled then no need to login => go home
      if (strategies.find((strategy: any) => strategy.type === "anonymous")) {
        return next("/");
      }

      // Filter supported strategies for UI
      const supported = strategies.filter((strategy: any) => {
        return strategy.type === "basic" || strategy.type === "oidc";
      });

      // Auto-redirect if:
      // 1. An OIDC strategy has redirect: true configured, OR
      // 2. ONLY OIDC is enabled (no basic auth)
      const oidcWithExplicitRedirect = supported.find(
        (strategy: any) => strategy.type === "oidc" && strategy.redirect,
      );
      const isOnlyOidc = supported.length === 1 && supported[0].type === "oidc";
      const oidcToRedirect =
        oidcWithExplicitRedirect || (isOnlyOidc ? supported[0] : null);

      if (oidcToRedirect) {
        const nextUrl = (to?.query?.next as string) || undefined;
        const redirection = await getOidcRedirection(
          oidcToRedirect.name,
          nextUrl,
        );
        if (redirection && redirection.url) {
          window.location.href = redirection.url;
          return;
        }
        throw new Error(
          redirection?.error || "Invalid redirection response from server",
        );
      }

      next(async (vm: any) => {
        vm.strategies = supported;
      });
    } catch (e: any) {
      next((vm: any) => {
        if (vm.eventBus) {
          vm.eventBus.emit(
            "notify",
            `Error when trying to get the authentication strategies (${e.message})`,
            "error",
          );
        }
      });
    }
  },
});
</script>

<style scoped>
.login-card {
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
}
</style>
