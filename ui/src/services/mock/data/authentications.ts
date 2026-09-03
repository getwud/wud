export const mockAuthentications = [
  {
    id: "basic.admin",
    type: "basic",
    name: "admin",
    configuration: {
      user: "admin",
      hash: "$apr1$********",
    },
  },
  {
    id: "oidc.authelia",
    type: "oidc",
    name: "authelia",
    configuration: {
      clientid: "wud",
      clientsecret: "********",
      discovery: "https://auth.homelab.lan/.well-known/openid-configuration",
    },
  },
];
