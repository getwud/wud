/**
 * Authentication service.
 */
import { url } from "./base";
import { isDemoMode, mockService } from "./mock";

// Current logged user
let user = undefined;

/**
 * Get auth strategies.
 * @returns {Promise<any>}
 */
async function getStrategies() {
  if (isDemoMode()) {
    return mockService.getStrategies();
  }
  const response = await fetch(url("auth/strategies"), { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Get current user.
 * @returns {Promise<*>}
 */
async function getUser() {
  if (isDemoMode()) {
    user = await mockService.getUser();
    return user;
  }
  try {
    const response = await fetch(url("auth/user"), {
      redirect: "manual",
      credentials: "include",
    });
    if (response.ok) {
      user = await response.json();
      return user;
    } else {
      user = undefined;
      return undefined;
    }
  } catch (e) {
    user = undefined;
    return undefined;
  }
}

/**
 * Perform auth Basic.
 * @param username
 * @param password
 * @returns {Promise<*>}
 */
async function loginBasic(username, password) {
  if (isDemoMode()) {
    user = await mockService.loginBasic(username, password);
    return user;
  }
  const base64 = btoa(`${username}:${password}`);
  const response = await fetch(url("auth/login"), {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Basic ${base64}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });
  user = await response.json();
  return user;
}

/**
 * Get Oidc redirection url.
 * @param name
 * @param nextPath
 * @returns {Promise<*>}
 */
async function getOidcRedirection(name, nextPath?: string) {
  if (isDemoMode()) {
    return mockService.getOidcRedirection(name, nextPath);
  }
  const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
  const response = await fetch(url(`auth/oidc/${name}/redirect${query}`), {
    credentials: "include",
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || `Server returned HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Logout current user.
 * @returns {Promise<any>}
 */
async function logout() {
  if (isDemoMode()) {
    user = undefined;
    return mockService.logout();
  }
  const response = await fetch(url("auth/logout"), {
    method: "POST",
    credentials: "include",
    redirect: "manual",
  });
  user = undefined;
  return response.json();
}

export { getStrategies, getUser, loginBasic, getOidcRedirection, logout };
