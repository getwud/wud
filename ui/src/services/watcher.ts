import { url } from "./base";
import { isDemoMode, mockService } from "./mock";

function getWatcherIcon() {
  return "mdi-update";
}

async function getAllWatchers() {
  if (isDemoMode()) {
    return mockService.getAllWatchers();
  }
  const response = await fetch(url("api/watchers"), { credentials: "include" });
  return response.json();
}

export { getWatcherIcon, getAllWatchers };

