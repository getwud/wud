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
    id: "oidc.authentik",
    type: "oidc",
    name: "authentik",
    configuration: {
      clientid: "wud-client",
      clientsecret: "********",
      discovery: "https://auth.homelab.lan/application/o/wud/.well-known/openid-configuration",
      admingroup: "authentik Admins",
      rwgroup: "wud-users",
      groupsclaim: "groups",
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
      admingroup: "admins",
      rwgroup: "devs",
      groupsclaim: "groups",
    },
  },
];
