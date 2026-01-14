function getStoreIcon() {
  return "mdi-file-multiple";
}

async function getStore() {
  const response = await fetch("/api/store", { credentials: "include" });
  return response.json();
}

export { getStoreIcon, getStore };
