async function getAppInfos() {
  const response = await fetch("/api/app", { credentials: "include" });
  return response.json();
}

export { getAppInfos };
