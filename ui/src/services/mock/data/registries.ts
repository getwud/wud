export const mockRegistries = [
  {
    id: "hub.public",
    type: "hub",
    name: "public",
    configuration: {
      login: null,
      token: "********",
      insecure: false,
    },
  },
  {
    id: "ghcr.private",
    type: "ghcr",
    name: "private",
    configuration: {
      username: "homelab-admin",
      token: "********",
      insecure: false,
    },
  },
  {
    id: "lscr.public",
    type: "lscr",
    name: "public",
    configuration: {
      insecure: false,
    },
  },
  {
    id: "custom.local",
    type: "custom",
    name: "local",
    configuration: {
      url: "https://registry.homelab.lan",
      username: "ci-bot",
      password: "********",
      insecure: false,
    },
  },
];
