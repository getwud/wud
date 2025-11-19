/**
 * Get registry component icon.
 * @returns {string}
 */
function getRegistryIcon() {
  return "mdi-database-search";
}

/**
 * Get registry provider icon (acr, ecr...).
 * @param provider
 * @returns {string}
 */
function getRegistryProviderIcon(provider) {
  let icon = "si-linuxcontainers";
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
async function getAllRegistries() {
  const response = await fetch("/api/registries", { credentials: "include" });
  return response.json();
}

export { getRegistryIcon, getRegistryProviderIcon, getAllRegistries };
