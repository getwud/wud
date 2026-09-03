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
  version: "8.4.0",
};

export const mockStrategies = [
  {
    type: "basic",
    name: "Credentials",
  },
];

export const mockUser = {
  username: "homelab-admin",
};
