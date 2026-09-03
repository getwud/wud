export const mockTriggers = [
  {
    id: "apprise.gotify",
    type: "apprise",
    name: "gotify",
    configuration: {
      url: "gotify://gotify.homelab.lan/A0b1C2d3E4f5G6",
      threshold: "all",
      mode: "batch",
      once: true,
    },
  },
  {
    id: "discord.homelab",
    type: "discord",
    name: "homelab",
    configuration: {
      url: "https://discord.com/api/webhooks/123456789/********",
      threshold: "minor",
      mode: "batch",
      once: true,
    },
  },
  {
    id: "mqtt.homeassistant",
    type: "mqtt",
    name: "homeassistant",
    configuration: {
      url: "mqtt://mosquitto.homelab.lan:1883",
      topic: "wud/container",
      hass: {
        enabled: true,
        prefix: "homeassistant",
      },
      threshold: "all",
      mode: "individual",
      once: false,
    },
  },
  {
    id: "smtp.gmail",
    type: "smtp",
    name: "gmail",
    configuration: {
      host: "smtp.gmail.com",
      port: 587,
      user: "alerts@homelab.lan",
      from: "wud@homelab.lan",
      to: "admin@homelab.lan",
      threshold: "major",
      mode: "batch",
      once: true,
    },
  },
];
