export const mockServer = {
  configuration: {
    port: 3000,
    basepath: "/",
    cors: {
      enabled: false,
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    },
    feature: {
      delete: true,
    },
  },
};

export const mockLog = {
  level: "info",
};

export const mockStore = {
  configuration: {
    path: "/wud/store",
  },
};

export const mockAppInfos = {
  name: "wud",
  version: "9.0.0",
};

export const mockStrategies = [
  {
    type: "basic",
    name: "Credentials",
  },
];

export const mockUser = {
  id: "user-admin-1",
  username: "homelab-admin",
  role: "admin",
  provider: "local",
  preferences: {
    theme: "light",
  },
};
