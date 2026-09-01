<div align="center">

<img src="website/docs/assets/wud-logo.svg" alt="What's Up Docker (WUD) Logo" width="220" />

# What's Up Docker? (WUD)

### *Keep your Docker containers up-to-date, automatically and effortlessly.*

[![Docker Pulls](https://img.shields.io/docker/pulls/getwud/wud?style=flat-square&logo=docker&logoColor=white&color=2496ED)](https://hub.docker.com/r/getwud/wud)
[![GitHub Stars](https://img.shields.io/github/stars/getwud/wud?style=flat-square&logo=github&color=FFB800)](https://github.com/getwud/wud/stargazers)
[![CI Status](https://img.shields.io/github/actions/workflow/status/getwud/wud/ci.yml?branch=main&style=flat-square&logo=githubactions&logoColor=white)](https://github.com/getwud/wud/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/getwud/wud?style=flat-square&color=41B883)](https://github.com/getwud/wud/blob/main/LICENSE)
[![Documentation](https://img.shields.io/badge/docs-getwud.github.io%2Fwud-2563EB?style=flat-square&logo=docusaurus&logoColor=white)](https://getwud.github.io/wud/)
[![Buy Me A Coffee](https://img.shields.io/badge/Donate-Buy%20Me%20A%20Coffee-orange?style=flat-square&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/61rUNMm)
[![Donate PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?style=flat-square&logo=paypal&logoColor=white)](https://www.paypal.com/donate/?business=ZSDMEC3ZE8DQ8&no_recurring=0&currency_code=EUR)

<p align="center">
  <a href="https://getwud.github.io/wud/"><b>📖 Documentation</b></a> •
  <a href="https://getwud.github.io/wud/docs/quickstart/"><b>🚀 Quick Start</b></a> •
  <a href="https://getwud.github.io/wud/docs/configuration/"><b>⚙️ Configuration</b></a> •
  <a href="https://getwud.github.io/wud/docs/configuration/triggers/"><b>🔔 Triggers</b></a> •
  <a href="https://getwud.github.io/wud/docs/configuration/registries/"><b>📦 Registries</b></a> •
  <a href="CONTRIBUTING.md"><b>🛠️ Contributing</b></a> •
  <a href="https://github.com/getwud/wud/issues"><b>💬 Issues & Support</b></a>
</p>

---

</div>

<p align="center">
  <img src="website/docs/assets/ui.png" alt="WUD Web Dashboard UI" width="850" style="border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</p>

## 💡 About WUD

**WUD (What's Up Docker?)** is a lightweight, proactive container update monitoring and automation tool. It continuously scans your container environments, detects image updates across public and private registries, performs semantic version analysis, and alerts you via your favorite notification channels—or triggers automatic container updates seamlessly.

```mermaid
flowchart LR
    W["🔍 <b>WATCHERS</b><br/>Discover running containers<br/><i>Local/Remote Docker, Compose, Nomad</i>"]
    WUD{{"⚡ <b>WUD ENGINE</b><br/>Compare versions &amp; digests"}}
    R["📦 <b>REGISTRIES</b><br/>Inspect tags &amp; manifests<br/><i>Docker Hub, GHCR, Private OCI</i>"]
    T["🚀 <b>TRIGGERS</b><br/>Notify &amp; Auto-Update<br/><i>Discord, Slack, Compose, MQTT</i>"]

    W -->|"Scan"| WUD
    WUD <-->|"Inspect"| R
    WUD -->|"Execute"| T
```

---

## ✨ Features

- 🔍 **Multi-Watcher Engine**  
  Monitor local Docker daemons, remote Docker engines over TLS, Docker Compose setups, or HashiCorp Nomad workloads.
- 📦 **Multi-Registry Integration**  
  Zero-config & authenticated support for **Docker Hub**, **GitHub Container Registry (GHCR)**, **AWS ECR**, **Google GCR/GAR**, **Azure ACR**, **Quay**, **GitLab**, **Gitea**, **Forgejo**, **Codeberg**, **LinuxServer (LSCR)**, and any custom/self-hosted OCI registry.
- 🔔 **30+ Notification & Automation Triggers**  
  Discord, Matrix, Mattermost, Zulip, Telegram, Slack, Signal, WhatsApp, Bark, Prowl, Home Assistant, Gotify, Ntfy, Pushover, Apprise, Webhooks, Kafka, AMQP/RabbitMQ, NATS, Opsgenie, PagerDuty, Uptime Kuma, GitHub Actions, GitLab CI, SMTP email, shell scripts, and native Docker / Compose / Nomad auto-updaters.
- 🔄 **Automated Container Updates**  
  Automatically pull new images and recreate containers on demand (Docker, Docker Compose, Nomad).
- 🏷️ **SemVer & Tag Filtering**  
  Flexible versioning strategies: target `semver` (major, minor, patch), match custom regular expressions, pin versions, or define include/exclude tag rules.
- 🖥️ **Interactive Web UI & REST API**  
  Clean, responsive web dashboard to inspect container statuses, trigger manual update checks, and query data via a full-featured REST API.
- 📊 **Prometheus & Grafana Ready**  
  Built-in Prometheus `/metrics` endpoint and pre-built Grafana dashboards for observability.
- 🔒 **Enterprise-Grade Authentication**  
  Secure your WUD dashboard with **OpenID Connect (OIDC)** (Keycloak, Authentik, Authelia, Google, etc.) or **HTTP Basic Auth**.

---

## ⚡ Quick Start

### 1. Run with Docker

```bash
docker run -d \
  --name wud \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  getwud/wud:latest
```

### 2. Run with Docker Compose

```yaml
services:
  whatsupdocker:
    image: getwud/wud:latest
    container_name: wud
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
```

> 🌐 **Access the Web UI**: Open [`http://localhost:3000`](http://localhost:3000) in your browser.

---

## 🧩 Supported Integrations

### 📦 Registries
| Registry | Description | Authentication |
| :--- | :--- | :---: |
| [**Docker Hub**](https://getwud.github.io/wud/docs/configuration/registries/hub/) | Public and private Docker Hub images | Anonymous / Token / Password |
| [**GitHub (GHCR)**](https://getwud.github.io/wud/docs/configuration/registries/ghcr/) | GitHub Container Registry packages | Personal Access Token |
| [**AWS ECR**](https://getwud.github.io/wud/docs/configuration/registries/ecr/) | Amazon Elastic Container Registry | AWS IAM Keys / IAM Roles |
| [**Google GCR / Artifact Registry**](https://getwud.github.io/wud/docs/configuration/registries/gcr/) | GCP Container & Artifact Registry | Service Account Key (JSON) |
| [**Azure ACR**](https://getwud.github.io/wud/docs/configuration/registries/acr/) | Azure Container Registry | Service Principal / Admin Secret |
| [**GitLab Registry**](https://getwud.github.io/wud/docs/configuration/registries/gitlab/) | GitLab Container Registry | Deploy Token / PAT |
| [**Quay.io**](https://getwud.github.io/wud/docs/configuration/registries/quay/) | Red Hat Quay | Robot Account / OAuth Token |
| [**Self-Hosted / OCI**](https://getwud.github.io/wud/docs/configuration/registries/custom/) | Harbor, Nexus, Artifactory, Gitea, Forgejo, Codeberg | Basic Auth / Bearer Token |

### 🔔 Triggers & Notifications
| Category | Supported Channels |
| :--- | :--- |
| **Chat & Messaging** | [Discord](https://getwud.github.io/wud/docs/configuration/triggers/discord/), [Matrix](https://getwud.github.io/wud/docs/configuration/triggers/matrix/), [Mattermost](https://getwud.github.io/wud/docs/configuration/triggers/mattermost/), [Signal](https://getwud.github.io/wud/docs/configuration/triggers/signal/), [Telegram](https://getwud.github.io/wud/docs/configuration/triggers/telegram/), [Slack](https://getwud.github.io/wud/docs/configuration/triggers/slack/), [Rocket.Chat](https://getwud.github.io/wud/docs/configuration/triggers/rocketchat/), [WhatsApp](https://getwud.github.io/wud/docs/configuration/triggers/whatsapp/), [Zulip](https://getwud.github.io/wud/docs/configuration/triggers/zulip/) |
| **Push Notifications & Alerting** | [Bark](https://getwud.github.io/wud/docs/configuration/triggers/bark/), [Gotify](https://getwud.github.io/wud/docs/configuration/triggers/gotify/), [IFTTT](https://getwud.github.io/wud/docs/configuration/triggers/ifttt/), [Ntfy](https://getwud.github.io/wud/docs/configuration/triggers/ntfy/), [Opsgenie](https://getwud.github.io/wud/docs/configuration/triggers/opsgenie/), [PagerDuty](https://getwud.github.io/wud/docs/configuration/triggers/pagerduty/), [Prowl](https://getwud.github.io/wud/docs/configuration/triggers/prowl/), [Pushover](https://getwud.github.io/wud/docs/configuration/triggers/pushover/), [Apprise](https://getwud.github.io/wud/docs/configuration/triggers/apprise/) |
| **Auto-Update & Orchestration** | [Docker Container](https://getwud.github.io/wud/docs/configuration/triggers/docker/), [Docker Compose](https://getwud.github.io/wud/docs/configuration/triggers/docker-compose/), [HashiCorp Nomad](https://getwud.github.io/wud/docs/configuration/triggers/nomad/) |
| **IoT & Message Queues** | [AMQP (RabbitMQ)](https://getwud.github.io/wud/docs/configuration/triggers/amqp/), [Apache Kafka](https://getwud.github.io/wud/docs/configuration/triggers/kafka/), [MQTT (Home Assistant auto-discovery)](https://getwud.github.io/wud/docs/configuration/triggers/mqtt/), [NATS](https://getwud.github.io/wud/docs/configuration/triggers/nats/) |
| **Automation & Custom** | [GitHub Actions](https://getwud.github.io/wud/docs/configuration/triggers/githubactions/), [GitLab CI](https://getwud.github.io/wud/docs/configuration/triggers/gitlabci/), [Home Assistant (Webhook)](https://getwud.github.io/wud/docs/configuration/triggers/homeassistant/), [HTTP Webhooks](https://getwud.github.io/wud/docs/configuration/triggers/http/), [Shell Command Execution](https://getwud.github.io/wud/docs/configuration/triggers/command/), [SMTP Email](https://getwud.github.io/wud/docs/configuration/triggers/smtp/), [Uptime Kuma](https://getwud.github.io/wud/docs/configuration/triggers/uptimekuma/) |

---

## 🏷️ Configuration via Docker Labels

WUD can be configured globally through environment variables or granularly per container using Docker labels:

```yaml
services:
  my-app:
    image: myorg/myapp:1.2.0
    labels:
      # Only consider semver minor and patch updates (e.g. 1.2.1, 1.3.0, but not 2.0.0)
      - "wud.tag.include=^1\\.\\d+\\.\\d+$"
      - "wud.tag.transform=^v(.*)$$ => $$1"
      
      # Send update notifications to a specific Discord webhook
      - "wud.trigger.discord.mywebhook.enabled=true"
      
      # Automatically recreate this container when an update is available
      - "wud.trigger.docker.myupdater.enabled=true"
```

Explore all configuration options in the [Configuration Hub](https://getwud.github.io/wud/docs/configuration/).

---

## 📚 Documentation

For complete setup guides, advanced configurations, tutorials, and API references, check out our official documentation:

👉 **[https://getwud.github.io/wud/](https://getwud.github.io/wud/)**

- 🚀 [Getting Started & Tutorials](https://getwud.github.io/wud/docs/quickstart/)
- ⚙️ [Configuration Reference](https://getwud.github.io/wud/docs/configuration/)
- 🔍 [Docker Watcher & TLS](https://getwud.github.io/wud/docs/configuration/watchers/)
- 📦 [Registry Authentication](https://getwud.github.io/wud/docs/configuration/registries/)
- 🔔 [Triggers & Automation Setup](https://getwud.github.io/wud/docs/configuration/triggers/)
- 📊 [Prometheus & Grafana Monitoring](https://getwud.github.io/wud/docs/monitoring/)
- 🔌 [REST API Reference](https://getwud.github.io/wud/docs/api/)
- ❓ [Frequently Asked Questions (FAQ)](https://getwud.github.io/wud/docs/faq/)

---

## 🤝 Community & Support

- 🛠️ **Want to contribute?** Read our [Developer & Contributing Guide](CONTRIBUTING.md).
- 🐛 **Found a bug or need a feature?** Submit an [Issue](https://github.com/getwud/wud/issues).
- ⭐ **Like WUD?** Give us a star on [GitHub](https://github.com/getwud/wud)!
- ☕ **Support the maintainer:** [Buy me a coffee](https://www.buymeacoffee.com/61rUNMm) or [Donate via PayPal](https://www.paypal.com/donate/?business=ZSDMEC3ZE8DQ8&no_recurring=0&currency_code=EUR).

---

## 📄 License

This project is open-source software licensed under the [MIT License](https://github.com/getwud/wud/blob/main/LICENSE).