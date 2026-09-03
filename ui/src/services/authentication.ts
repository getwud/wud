import { url } from "./base";
import { isDemoMode, mockService } from "./mock";

function getAuthenticationIcon() {
  return "mdi-lock";
}

async function getAllAuthentications() {
  if (isDemoMode()) {
    return mockService.getAllAuthentications();
  }
  const response = await fetch(url("api/authentications"), { credentials: "include" });
  return response.json();
}

export { getAuthenticationIcon, getAllAuthentications };

