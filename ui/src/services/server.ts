function getServerIcon() {
  return "mdi-connection";
}

async function getServer() {
  const response = await fetch("/api/server", { credentials: "include" });
  return response.json();
}

export { getServerIcon, getServer };
