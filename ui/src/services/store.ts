import { url } from "./base";
import { isDemoMode, mockService } from "./mock";

function getStoreIcon() {
  return "mdi-file-multiple";
}

async function getStore() {
  if (isDemoMode()) {
    return mockService.getStore();
  }
  const response = await fetch(url("api/store"), { credentials: "include" });
  return response.json();
}

export { getStoreIcon, getStore };

