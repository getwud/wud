import {
  createRouter,
  createWebHistory,
  createWebHashHistory,
  RouteRecordRaw,
  RouteLocationNormalized,
} from "vue-router";
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
    path: "/hub",
    name: "hub",
    component: () => import("@/views/HubView.vue"),
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
    path: "/configuration/users",
    name: "users",
    component: () => import("../views/ConfigurationUsersView.vue"),
    meta: { roles: ["admin"] },
  },
  {
    path: "/profile",
    name: "profile",
    component: () => import("../views/ProfileView.vue"),
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
 * Validate that a redirect URL is a safe local relative path.
 * Must start with '/', must not start with '//' or '/\', must not contain backslashes,
 * and must not contain any protocol scheme (http:, https:, javascript:, data:, etc.).
 *
 * @param url
 * @returns {boolean}
 */
export function isSafeRedirect(url: unknown): boolean {
  if (typeof url !== "string") {
    return false;
  }
  const trimmed = url.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\")
  ) {
    return false;
  }
  // Disallow any protocol scheme (e.g. http:, https:, javascript:, data:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return false;
  }
  // Check decoded URL as well to prevent bypass via URL encoding
  try {
    const decoded = decodeURIComponent(trimmed);
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.startsWith("/\\") ||
      decoded.includes("\\") ||
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)
    ) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

/**
 * Get a safe redirect destination. Returns the sanitized relative URL if valid,
 * or falls back to { name: "home" }.
 *
 * @param url
 * @returns {string | { name: "home" }}
 */
export function getSafeRedirect(url: unknown): string | { name: "home" } {
  if (isSafeRedirect(url)) {
    return (url as string).trim();
  }
  return { name: "home" };
}

/**
 * Apply authentication navigation guard.
 * @param to
 * @returns {Promise<any>}
 */
export async function applyAuthNavigationGuard(to: RouteLocationNormalized) {
  // Allow forcing access to the login page when capturing screenshots by
  // using the `screenshots` query parameter (e.g. #/login?screenshots=true).
  if (to.name === "login") {
    if (isDemoMode() && to.query?.screenshots) {
      return true;
    }
    if (isDemoMode()) {
      return { name: "home" };
    }
    const user = await getUser();
    if (user !== undefined) {
      return getSafeRedirect(to.query?.next);
    }
    return true;
  } else {
    // Get current user
    const user = await getUser();

    // User is authenticated => go to route
    if (user !== undefined) {
      // Check required roles
      if (to.meta?.roles && Array.isArray(to.meta.roles)) {
        if (!to.meta.roles.includes(user.role)) {
          return { name: "home" };
        }
      }

      // Emit authenticated event after navigation
      nextTick(() => {
        if ((router as any).app?.config?.globalProperties?.$eventBus) {
          (router as any).app.config.globalProperties.$eventBus.emit("authenticated", user);
        }
      });

      // Next route in param? redirect
      if (to.query?.next !== undefined) {
        return getSafeRedirect(to.query.next);
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
