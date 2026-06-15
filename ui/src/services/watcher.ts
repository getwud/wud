import { url } from "./base";

function getWatcherIcon() {
  return "mdi-update";
}

async function getAllWatchers() {
  const response = await fetch(url("api/watchers"), { credentials: "include" });
  return response.json();
}

export { getWatcherIcon, getAllWatchers };
