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
      showDialog: true,
    };
  },

  methods: {
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
  async beforeRouteEnter(to, from, next) {
    try {
      const strategies = await getStrategies();

      // If anonymous auth is enabled then no need to login => go home
      if (strategies.find((strategy) => strategy.type === "anonymous")) {
        next("/");
      }

      // If oidc strategy supporting redirect
      const oidcWithRedirect = strategies.find(
        (strategy) => strategy.type === "oidc" && strategy.redirect,
      );
      if (oidcWithRedirect) {
        const redirection = await getOidcRedirection(oidcWithRedirect.name);
        window.location.href = redirection.url;
      } else {
        // Filter on supported auth for UI
        next(async (vm: any) => {
          vm.strategies = strategies.filter(vm.isSupportedStrategy);
        });
      }
    } catch (e: any) {
      // Note: In beforeRouteEnter, 'this' is not available, so we'll handle this in the component
      next((vm: any) => {
        if (vm.eventBus) {
          vm.eventBus.emit(
            "notify",
            `Error when trying to get the authentication strategies (${e.message})`,
            "error",
          );
        } else {
          console.error(`Error when trying to get the authentication strategies (${e.message})`);
        }
      });
    }
  },
});
