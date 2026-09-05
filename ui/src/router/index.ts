import { createRouter, createWebHistory, createWebHashHistory, RouteRecordRaw } from "vue-router";
import { getUser } from "@/services/auth";
import { isDemoMode } from "@/services/mock";
import { nextTick } from "vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomeView.vue"),
  },
  {
    path: "/login",
    name: "login",
    component: () => import("../views/LoginView.vue"),
  },
  {
    path: "/containers",
    name: "containers",
    component: () => import("../views/ContainersView.vue"),
  },
  {
    path: "/configuration/authentications",
    name: "authentications",
    component: () => import("../views/ConfigurationAuthenticationsView.vue"),
  },
  {
    path: "/configuration/registries",
    name: "registries",
    component: () => import("../views/ConfigurationRegistriesView.vue"),
  },
  {
    path: "/configuration/server",
    name: "server",
    component: () => import("../views/ConfigurationServerView.vue"),
  },
  {
    path: "/logs",
    name: "logs",
    component: () => import("../views/LogsView.vue"),
  },
  {
    path: "/configuration/logs",
    redirect: "/logs",
  },
  {
    path: "/configuration/triggers",
    name: "triggers",
    component: () => import("../views/ConfigurationTriggersView.vue"),
  },
  {
    path: "/configuration/watchers",
    name: "watchers",
    component: () => import("../views/ConfigurationWatchersView.vue"),
  },
];

const router = createRouter({
  history: isDemoMode()
    ? createWebHashHistory()
    : createWebHistory((window as any).__WUD_BASE_PATH__ || '/'),
  routes,
});

/**
 * Apply authentication navigation guard.
 * @param to
 * @param from
 * @returns {Promise<void>}
 */
async function applyAuthNavigationGuard(to) {
  if (to.name === "login") {
    return true;
  } else {
    // Get current user
    const user = await getUser();

    // User is authenticated => go to route
    if (user !== undefined) {
      // Emit authenticated event after navigation
      nextTick(() => {
        if ((router as any).app?.config?.globalProperties?.$eventBus) {
          (router as any).app.config.globalProperties.$eventBus.emit("authenticated", user);
        }
      });
      
      // Next route in param? redirect
      if (to.query.next) {
        return to.query.next;
      } else {
        return true;
      }
    } else {
      // User is not authenticated => save destination as next & go to login
      return {
        name: "login",
        query: {
          next: to.fullPath,
        },
      };
    }
  }
}

/**
 * Apply navigation guards.
 */
router.beforeEach(async (to) => {
  return await applyAuthNavigationGuard(to);
});



export default router;
