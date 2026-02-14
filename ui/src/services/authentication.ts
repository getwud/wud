function getAuthenticationIcon() {
  return "mdi-lock";
}

async function getAllAuthentications() {
  const response = await fetch("/api/authentications", { credentials: "include" });
  return response.json();
}

export { getAuthenticationIcon, getAllAuthentications };
