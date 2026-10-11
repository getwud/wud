// Mock dependencies before imports
jest.mock("@/services/auth", () => ({
  getUser: jest.fn(),
}));

jest.mock("@/services/mock", () => ({
  isDemoMode: jest.fn().mockReturnValue(false),
}));

import router, {
  isSafeRedirect,
  getSafeRedirect,
  applyAuthNavigationGuard,
} from "@/router";
import { getUser } from "@/services/auth";
import { isDemoMode } from "@/services/mock";
import { RouteLocationNormalized } from "vue-router";

describe("Router", () => {
  let mockNext: jest.Mock;

  beforeEach(() => {
    (getUser as jest.Mock).mockReset();
    (isDemoMode as jest.Mock).mockReset();
    (isDemoMode as jest.Mock).mockReturnValue(false);
    mockNext = jest.fn();
  });

  describe("Route definitions", () => {
    it("has correct routes defined", () => {
      const routes = router.getRoutes();
      const routeNames = routes.map((route) => route.name);

      expect(routeNames).toContain("home");
      expect(routeNames).toContain("login");
      expect(routeNames).toContain("containers");
      expect(routeNames).toContain("authentications");
      expect(routeNames).toContain("registries");
      expect(routeNames).toContain("server");
      expect(routeNames).toContain("triggers");
      expect(routeNames).toContain("watchers");
    });

    it("has correct route paths", () => {
      const routes = router.getRoutes();
      const homeRoute = routes.find((route) => route.name === "home");
      const containersRoute = routes.find((route) => route.name === "containers");
      const loginRoute = routes.find((route) => route.name === "login");

      expect(homeRoute?.path).toBe("/");
      expect(containersRoute?.path).toBe("/containers");
      expect(loginRoute?.path).toBe("/login");
    });

    it("allows access to login route without authentication check on route config", async () => {
      const routes = router.getRoutes();
      const loginRoute = routes.find((r) => r.name === "login");

      if (loginRoute?.beforeEnter) {
        await (loginRoute.beforeEnter as any)({}, {}, mockNext);
        expect(mockNext).toHaveBeenCalled();
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe("isSafeRedirect", () => {
    describe("valid relative local paths", () => {
      it("accepts root path '/'", () => {
        expect(isSafeRedirect("/")).toBe(true);
      });

      it("accepts local relative path '/containers'", () => {
        expect(isSafeRedirect("/containers")).toBe(true);
      });

      it("accepts local relative path '/settings'", () => {
        expect(isSafeRedirect("/settings")).toBe(true);
      });

      it("accepts nested local relative path '/configuration/registries'", () => {
        expect(isSafeRedirect("/configuration/registries")).toBe(true);
      });

      it("accepts local relative path with query parameters and hash", () => {
        expect(isSafeRedirect("/containers?filter=running#top")).toBe(true);
      });
    });

    describe("rejection of absolute URLs", () => {
      it("rejects https://evil.com", () => {
        expect(isSafeRedirect("https://evil.com")).toBe(false);
      });

      it("rejects http://evil.com", () => {
        expect(isSafeRedirect("http://evil.com")).toBe(false);
      });

      it("rejects ftp://evil.com", () => {
        expect(isSafeRedirect("ftp://evil.com")).toBe(false);
      });
    });

    describe("rejection of protocol-relative URLs", () => {
      it("rejects //evil.com", () => {
        expect(isSafeRedirect("//evil.com")).toBe(false);
      });

      it("rejects ///evil.com", () => {
        expect(isSafeRedirect("///evil.com")).toBe(false);
      });

      it("rejects /\\evil.com", () => {
        expect(isSafeRedirect("/\\evil.com")).toBe(false);
      });

      it("rejects /\\\\evil.com", () => {
        expect(isSafeRedirect("/\\\\evil.com")).toBe(false);
      });

      it("rejects '//'", () => {
        expect(isSafeRedirect("//")).toBe(false);
      });
    });

    describe("rejection of exotic schemes", () => {
      it("rejects javascript: schemes", () => {
        expect(isSafeRedirect("javascript:alert(1)")).toBe(false);
        expect(isSafeRedirect("javascript:void(0)")).toBe(false);
      });

      it("rejects data: schemes", () => {
        expect(isSafeRedirect("data:text/html,<script>alert(1)</script>")).toBe(false);
      });

      it("rejects vbscript: schemes", () => {
        expect(isSafeRedirect("vbscript:msgbox(1)")).toBe(false);
      });
    });

    describe("rejection of backslashes and bypass attempts", () => {
      it("rejects paths with backslashes anywhere", () => {
        expect(isSafeRedirect("\\\\evil.com")).toBe(false);
        expect(isSafeRedirect("\\evil.com")).toBe(false);
        expect(isSafeRedirect("/test\\something")).toBe(false);
      });

      it("rejects URL-encoded protocol-relative or backslash bypasses", () => {
        expect(isSafeRedirect("/%2f/evil.com")).toBe(false);
        expect(isSafeRedirect("/%5cevil.com")).toBe(false);
        expect(isSafeRedirect("%2f%2fevil.com")).toBe(false);
      });
    });

    describe("rejection of invalid and empty inputs", () => {
      it("rejects empty string", () => {
        expect(isSafeRedirect("")).toBe(false);
      });

      it("rejects whitespace-only string", () => {
        expect(isSafeRedirect("   ")).toBe(false);
      });

      it("rejects non-string inputs", () => {
        expect(isSafeRedirect(undefined)).toBe(false);
        expect(isSafeRedirect(null)).toBe(false);
        expect(isSafeRedirect(123)).toBe(false);
        expect(isSafeRedirect({})).toBe(false);
        expect(isSafeRedirect(["/containers"])).toBe(false);
      });
    });
  });

  describe("getSafeRedirect", () => {
    it("returns valid relative path as-is", () => {
      expect(getSafeRedirect("/containers")).toBe("/containers");
      expect(getSafeRedirect("/settings")).toBe("/settings");
    });

    it("trims valid relative path", () => {
      expect(getSafeRedirect(" /containers ")).toBe("/containers");
    });

    it("falls back to { name: 'home' } on absolute URLs", () => {
      expect(getSafeRedirect("https://evil.com")).toEqual({ name: "home" });
      expect(getSafeRedirect("http://evil.com")).toEqual({ name: "home" });
    });

    it("falls back to { name: 'home' } on protocol-relative URLs", () => {
      expect(getSafeRedirect("//evil.com")).toEqual({ name: "home" });
      expect(getSafeRedirect("///evil.com")).toEqual({ name: "home" });
      expect(getSafeRedirect("/\\evil.com")).toEqual({ name: "home" });
    });

    it("falls back to { name: 'home' } on exotic schemes", () => {
      expect(getSafeRedirect("javascript:alert(1)")).toEqual({ name: "home" });
      expect(getSafeRedirect("data:text/html,<script>alert(1)</script>")).toEqual({ name: "home" });
    });

    it("falls back to { name: 'home' } when next is invalid, empty, or absent", () => {
      expect(getSafeRedirect(undefined)).toEqual({ name: "home" });
      expect(getSafeRedirect(null)).toEqual({ name: "home" });
      expect(getSafeRedirect("")).toEqual({ name: "home" });
      expect(getSafeRedirect("   ")).toEqual({ name: "home" });
      expect(getSafeRedirect(123)).toEqual({ name: "home" });
      expect(getSafeRedirect(["/containers"])).toEqual({ name: "home" });
    });
  });

  describe("applyAuthNavigationGuard", () => {
    const createMockRoute = (overrides: Partial<RouteLocationNormalized> = {}): RouteLocationNormalized =>
      ({
        name: "containers",
        path: "/containers",
        fullPath: "/containers",
        query: {},
        params: {},
        hash: "",
        matched: [],
        meta: {},
        redirectedFrom: undefined,
        ...overrides,
      }) as RouteLocationNormalized;

    describe("when user is NOT authenticated", () => {
      beforeEach(() => {
        (getUser as jest.Mock).mockResolvedValue(undefined);
      });

      it("allows access to the login page", async () => {
        const to = createMockRoute({ name: "login", path: "/login", fullPath: "/login" });
        const result = await applyAuthNavigationGuard(to);
        expect(result).toBe(true);
      });

      it("redirects unauthenticated access from protected route to login with next param", async () => {
        const to = createMockRoute({
          name: "containers",
          path: "/containers",
          fullPath: "/containers?filter=running",
        });
        const result = await applyAuthNavigationGuard(to);
        expect(result).toEqual({
          name: "login",
          query: {
            next: "/containers?filter=running",
          },
        });
      });
    });

    describe("when user IS authenticated", () => {
      const mockUser = { username: "admin", role: "admin" };

      beforeEach(() => {
        (getUser as jest.Mock).mockResolvedValue(mockUser);
      });

      describe("navigating to login page", () => {
        it("redirects to valid relative path if next is provided", async () => {
          const to = createMockRoute({
            name: "login",
            path: "/login",
            fullPath: "/login?next=/containers",
            query: { next: "/containers" },
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toBe("/containers");
        });

        it("redirects to home if next is absent", async () => {
          const to = createMockRoute({
            name: "login",
            path: "/login",
            fullPath: "/login",
            query: {},
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toEqual({ name: "home" });
        });

        it("rejects absolute URL in next and redirects to home", async () => {
          const to = createMockRoute({
            name: "login",
            path: "/login",
            fullPath: "/login?next=https://evil.com",
            query: { next: "https://evil.com" },
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toEqual({ name: "home" });
        });

        it("rejects protocol-relative URL in next and redirects to home", async () => {
          const to = createMockRoute({
            name: "login",
            path: "/login",
            fullPath: "/login?next=//evil.com",
            query: { next: "//evil.com" },
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toEqual({ name: "home" });
        });

        it("rejects backslash protocol-relative URL in next and redirects to home", async () => {
          const to = createMockRoute({
            name: "login",
            path: "/login",
            fullPath: "/login?next=/\\evil.com",
            query: { next: "/\\evil.com" },
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toEqual({ name: "home" });
        });

        it("rejects exotic schemes in next and redirects to home", async () => {
          const to = createMockRoute({
            name: "login",
            path: "/login",
            fullPath: "/login?next=javascript:alert(1)",
            query: { next: "javascript:alert(1)" },
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toEqual({ name: "home" });
        });
      });

      describe("navigating to protected pages", () => {
        it("allows access when next param is absent", async () => {
          const to = createMockRoute({
            name: "containers",
            path: "/containers",
            fullPath: "/containers",
            query: {},
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toBe(true);
        });

        it("redirects to valid next param when present", async () => {
          const to = createMockRoute({
            name: "home",
            path: "/",
            fullPath: "/?next=/settings",
            query: { next: "/settings" },
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toBe("/settings");
        });

        it("rejects malicious next param on protected page and redirects to home", async () => {
          const to = createMockRoute({
            name: "home",
            path: "/",
            fullPath: "/?next=https://evil.com",
            query: { next: "https://evil.com" },
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toEqual({ name: "home" });
        });

        it("rejects protocol-relative next param on protected page and redirects to home", async () => {
          const to = createMockRoute({
            name: "home",
            path: "/",
            fullPath: "/?next=//evil.com",
            query: { next: "//evil.com" },
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toEqual({ name: "home" });
        });

        it("redirects to home if user lacks required role", async () => {
          const standardUser = { username: "user", role: "user" };
          (getUser as jest.Mock).mockResolvedValue(standardUser);

          const to = createMockRoute({
            name: "users",
            path: "/configuration/users",
            fullPath: "/configuration/users",
            meta: { roles: ["admin"] },
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toEqual({ name: "home" });
        });

        it("allows access if user has required role", async () => {
          const to = createMockRoute({
            name: "users",
            path: "/configuration/users",
            fullPath: "/configuration/users",
            meta: { roles: ["admin"] },
          });
          const result = await applyAuthNavigationGuard(to);
          expect(result).toBe(true);
        });

        it("emits authenticated event on eventBus if present", async () => {
          const mockEmit = jest.fn();
          (router as any).app = {
            config: {
              globalProperties: {
                $eventBus: { emit: mockEmit },
              },
            },
          };

          const to = createMockRoute({ name: "containers", path: "/containers" });
          await applyAuthNavigationGuard(to);

          // Wait nextTick
          await new Promise((resolve) => setTimeout(resolve, 0));
          expect(mockEmit).toHaveBeenCalledWith("authenticated", mockUser);

          // Cleanup
          delete (router as any).app;
        });
      });
    });

    describe("in demo mode", () => {
      beforeEach(() => {
        (isDemoMode as jest.Mock).mockReturnValue(true);
      });

      it("redirects login to home in demo mode without screenshots param", async () => {
        const to = createMockRoute({
          name: "login",
          path: "/login",
          fullPath: "/login",
          query: {},
        });
        const result = await applyAuthNavigationGuard(to);
        expect(result).toEqual({ name: "home" });
      });

      it("allows login access in demo mode when screenshots param is true", async () => {
        const to = createMockRoute({
          name: "login",
          path: "/login",
          fullPath: "/login?screenshots=true",
          query: { screenshots: "true" },
        });
        const result = await applyAuthNavigationGuard(to);
        expect(result).toBe(true);
      });
    });
  });
});