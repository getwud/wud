import { computed, inject, defineComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import { logout } from "@/services/auth";

export default defineComponent({
  props: {
    user: {
      type: Object,
      required: true,
    },
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const eventBus = inject("eventBus") as any;

    const viewName = computed(() => {
      return route.name;
    });

    const performLogout = async () => {
      try {
        const logoutResult = await logout();
        if (logoutResult.logoutUrl) {
          window.location = logoutResult.logoutUrl;
        } else {
          await router.push({
            name: "login",
          });
        }
      } catch (e: any) {
        eventBus.emit(
          "notify",
          `Error when trying to logout (${e.message})`,
          "error",
        );
      }
    };

    return {
      viewName,
      logout: performLogout,
    };
  },
});
