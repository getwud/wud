import { url } from "./base";
import { isDemoMode, mockService } from "./mock";

async function getAppInfos() {
  if (isDemoMode()) {
    return mockService.getAppInfos();
  }
  const response = await fetch(url("api/app"), { credentials: "include" });
  return response.json();
}

export { getAppInfos };

