function getLogIcon() {
  return "mdi-bug";
}

async function getLog() {
  const response = await fetch("/api/log", { credentials: "include" });
  return response.json();
}

export { getLogIcon, getLog };
