import { url } from "./base";

function getServerIcon() {
  return "mdi-connection";
}

async function getServer() {
  const response = await fetch(url("api/server"), { credentials: "include" });
  return response.json();
}

export { getServerIcon, getServer };
