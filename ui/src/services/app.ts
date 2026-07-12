import { url } from "./base";

async function getAppInfos() {
  const response = await fetch(url("api/app"), { credentials: "include" });
  return response.json();
}

export { getAppInfos };
