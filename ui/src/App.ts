import {
  ref,
  computed,
  onMounted,
  onUpdated,
  inject,
  getCurrentInstance,
  watch,
  defineComponent,
} from "vue";
import NavigationDrawer from "@/components/NavigationDrawer.vue";
import AppBar from "@/components/AppBar.vue";
import SnackBar from "@/components/SnackBar.vue";
import AppFooter from "@/components/AppFooter.vue";
import { getServer } from "@/services/server";
import { useRoute } from "vue-router";

export default defineComponent({
  components: {
    NavigationDrawer,
    AppBar,
    SnackBar,
    AppFooter,
  },
  setup() {
    const route = useRoute();
    const eventBus = inject("eventBus") as any;
    const instance = getCurrentInstance();

    const snackbarMessage = ref("");
    const snackbarShow = ref(false);
    const snackbarLevel = ref("info");
    const user = ref(undefined);

    const items = computed(() => {
      return route.fullPath
        .replace("/", "")
        .split("/")
        .map((item) => ({
          text: item ? item : "Home",
          disabled: false,
          href: "",
        }));
    });

    const authenticated = computed(() => {
      return user.value !== undefined;
    });

    const onAuthenticated = (userData: any) => {
      user.value = userData;
    };

    const notify = (message: string, level = "info") => {
      snackbarMessage.value = message;
      snackbarShow.value = true;
      snackbarLevel.value = level;
    };

    const notifyClose = () => {
      snackbarMessage.value = "";
      snackbarShow.value = false;
    };

    onMounted(async () => {
      eventBus.on("authenticated", onAuthenticated);
      eventBus.on("notify", notify);
      eventBus.on("notify:close", notifyClose);
    });

    // Watch route changes to clear user on login page and check auth state
    watch(route, async (newRoute) => {
      if (newRoute.name === 'login') {
        user.value = undefined;
      } else if (!user.value) {
        // Fallback auth check if user not set by router guard
        try {
          const response = await fetch("/auth/user", {
            credentials: "include",
          });
          if (response.ok) {
            const currentUser = await response.json();
            if (currentUser && currentUser.username) {
              onAuthenticated(currentUser);
            }
          }
        } catch (e) {
          console.log("Fallback auth check failed:", e);
        }
      }
    });

    onUpdated(async () => {
      if (
        authenticated.value &&
        instance &&
        !instance.appContext.config.globalProperties.$serverConfig
      ) {
        const server = await getServer();
        instance.appContext.config.globalProperties.$serverConfig =
          server.configuration;
      }
    });

    return {
      snackbarMessage,
      snackbarShow,
      snackbarLevel,
      user,
      items,
      authenticated,
    };
  },
});
