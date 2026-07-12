import { url } from "./base";

function getLogIcon() {
  return "mdi-bug";
}

async function getLog() {
  const response = await fetch(url("api/log"), { credentials: "include" });
  return response.json();
}

export { getLogIcon, getLog };
