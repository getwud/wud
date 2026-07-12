import { url } from "./base";

function getAuthenticationIcon() {
  return "mdi-lock";
}

async function getAllAuthentications() {
  const response = await fetch(url("api/authentications"), { credentials: "include" });
  return response.json();
}

export { getAuthenticationIcon, getAllAuthentications };
