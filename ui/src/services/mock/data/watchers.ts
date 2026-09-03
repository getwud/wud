export const mockWatchers = [
  {
    id: "docker.local",
    type: "docker",
    name: "local",
    configuration: {
      socket: "/var/run/docker.sock",
      cron: "0 * * * *",
      watchbydefault: true,
      include: null,
      exclude: null,
    },
  },
  {
    id: "docker.remote-vps",
    type: "docker",
    name: "remote-vps",
    configuration: {
      host: "vps.homelab.lan",
      port: 2376,
      tls: true,
      cron: "*/30 * * * *",
      watchbydefault: true,
      include: null,
      exclude: null,
    },
  },
];
