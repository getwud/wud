import { url } from "./base";
import { isDemoMode, mockService } from "./mock";

let registriesCache: any[] = [];

/**
 * Get registry component icon.
 * @returns {string}
 */
function getRegistryIcon(): string {
  return "mdi-database-search";
}

/**
 * Get registry provider icon (acr, ecr...).
 * @param provider
 * @param registryItem
 * @returns {string}
 */
function getRegistryProviderIcon(provider: string, registryItem?: any): string {
  if (registryItem?.configuration?.icon) {
    return registryItem.configuration.icon;
  }

  if (provider && registriesCache && registriesCache.length > 0) {
    const cached = registriesCache.find(
      (r: any) =>
        r &&
        (r.id === provider || `${r.type}.${r.name}` === provider) &&
        r.configuration?.icon
    );
    if (cached) {
      return cached.configuration.icon;
    }
  }

  let icon = "si-linuxcontainers";
  if (!provider) {
    return icon;
  }
  switch (provider.split(".")[0]) {
    case "acr":
      icon = "si-microsoftazure";
      break;
    case "custom":
      icon = "si-opencontainersinitiative";
      break;
    case "ecr":
      icon = "si-amazonaws";
      break;
    case "forgejo":
      icon = "si-forgejo";
      break;
    case "gcr":
      icon = "si-googlecloud";
      break;
    case "ghcr":
      icon = "si-github";
      break;
    case "gitea":
      icon = "si-gitea";
      break;
    case "gitlab":
      icon = "si-gitlab";
      break;
    case "dhi":
    case "hub":
      icon = "si-docker";
      break;
    case "quay":
      icon = "si-redhat";
      break;
    case "lscr":
      icon = "si-linuxserver";
      break;
    case "trueforge":
      icon = "si-linuxcontainers";
      break;
  }
  return icon;
}

/**
 * get all registries.
 * @returns {Promise<any>}
 */
async function getAllRegistries(): Promise<any> {
  if (isDemoMode()) {
    const data = await mockService.getAllRegistries();
    registriesCache = Array.isArray(data) ? data : [];
    return data;
  }
  const response = await fetch(url("api/registries"), { credentials: "include" });
  const data = await response.json();
  registriesCache = Array.isArray(data) ? data : [];
  return data;
}

export { getRegistryIcon, getRegistryProviderIcon, getAllRegistries };
