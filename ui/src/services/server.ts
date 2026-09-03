import { url } from "./base";
import { isDemoMode, mockService } from "./mock";

function getServerIcon() {
  return "mdi-connection";
}

async function getServer() {
  if (isDemoMode()) {
    return mockService.getServer();
  }
  const response = await fetch(url("api/server"), { credentials: "include" });
  return response.json();
}

export { getServerIcon, getServer };

