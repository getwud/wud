---
title: Registries
description: Overview of container registry integrations and authentication in What's Up Docker (WUD).
---

import { RegistryGrid, RegistryCard } from '@site/src/components/RegistryCard';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';

# Registries

WUD inspects remote container registries to discover image tags, digest hashes, and semver updates for your monitored containers.

:::tip[How WUD Resolves Registries]
When WUD monitors a container (e.g. `redis:7-alpine` or `ghcr.io/owner/app:1.2.0`), it parses the image name to detect the target registry domain automatically.
:::

---

## Request Throttling

WUD limits requests independently for each configured registry instance. Requests above the limit wait in FIFO order, so one registry cannot consume the capacity of another.

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_{REGISTRY_TYPE}_{REGISTRY_NAME}_CONCURRENCY"
    required={false}
    type="integer"
    defaultValue="2"
    supported="Any integer greater than or equal to 1">
    Maximum number of active requests for this registry instance. An invalid value prevents the registry from registering.
  </ConfigOption>
</ConfigList>

When a registry returns HTTP 429, WUD retries twice. It honors `Retry-After` values up to 60 seconds; otherwise it waits for a jittered 1–2 seconds before the first retry and 2–4 seconds before the second. Request slots are released during these delays. Longer retry windows are deferred to the next normal scan, and non-429 failures are not retried.

Retry timing is fixed and is not separately configurable.

---

## ⚡ Active by Default (Zero-Config for Public Images)

These registries **work out of the box with zero configuration** for public images.

You only need to configure environment variables if you want to:
- Access **private repositories**
- Increase **API rate limits** (e.g. Docker Hub authenticated tier)
- Connect to a **self-hosted instance** (e.g. on-premise Forgejo or Quay)

<RegistryGrid>
  <RegistryCard
    title="Alibaba Cloud (ACR)"
    href="/docs/configuration/registries/alibaba"
    defaultSupport={true}
    description="Monitors public images on Alibaba Cloud Container Registry (*.aliyuncs.com) anonymously."
  />

  <RegistryCard
    title="AWS ECR Public"
    href="/docs/configuration/registries/ecr"
    defaultSupport={true}
    description="Monitors public images hosted on Amazon ECR Public Gallery anonymously without AWS credentials."
  />

  <RegistryCard
    title="Codeberg"
    href="/docs/configuration/registries/codeberg"
    defaultSupport={true}
    description="Public Codeberg images supported anonymously. Configure access tokens for private packages."
  />

  <RegistryCard
    title="DigitalOcean (DOCR)"
    href="/docs/configuration/registries/docr"
    defaultSupport={true}
    description="Monitors public repositories on DigitalOcean Container Registry anonymously out of the box."
  />

  <RegistryCard
    title="Docker Hub"
    href="/docs/configuration/registries/hub"
    defaultSupport={true}
    description="Monitors public images anonymously by default. Configure username and PAT/password for private repos or increased rate limits."
  />

  <RegistryCard
    title="Forgejo"
    href="/docs/configuration/registries/forgejo"
    defaultSupport={true}
    description="Public images on code.forgejo.org supported anonymously. Configure instance URL and tokens for self-hosted Forgejo."
  />

  <RegistryCard
    title="GitHub Container Registry (GHCR)"
    href="/docs/configuration/registries/ghcr"
    defaultSupport={true}
    description="Monitors public packages anonymously out of the box. Configure a GitHub Personal Access Token (PAT) for private packages."
  />

  <RegistryCard
    title="Google Container Registry (GCR)"
    href="/docs/configuration/registries/gcr"
    defaultSupport={true}
    description="Public images supported anonymously. Configure a Google Service Account JSON key for private images and Artifact Registry."
  />

  <RegistryCard
    title="IBM Cloud (ICR)"
    href="/docs/configuration/registries/icr"
    defaultSupport={true}
    description="Monitors public namespaces on IBM Cloud Container Registry (*.icr.io) anonymously."
  />

  <RegistryCard
    title="JFrog Artifactory"
    href="/docs/configuration/registries/jfrog"
    defaultSupport={true}
    description="Monitors public images hosted on JFrog Cloud (*.jfrog.io) anonymously."
  />

  <RegistryCard
    title="LinuxServer (LSCR)"
    href="/docs/configuration/registries/lscr"
    defaultSupport={true}
    description="Seamless tag and update monitoring for the entire LinuxServer.io container ecosystem."
  />

  <RegistryCard
    title="Oracle Cloud (OCIR)"
    href="/docs/configuration/registries/ocir"
    defaultSupport={true}
    description="Monitors public images on Oracle Cloud Infrastructure Registry (*.ocir.io) anonymously."
  />

  <RegistryCard
    title="Quay"
    href="/docs/configuration/registries/quay"
    defaultSupport={true}
    description="Red Hat Quay public images supported anonymously. Supports custom tokens for private repos and on-prem Quay clusters."
  />

  <RegistryCard
    title="Scaleway"
    href="/docs/configuration/registries/scaleway"
    defaultSupport={true}
    description="Monitors public namespaces on Scaleway Container Registry (rg.<region>.scw.cloud) anonymously."
  />

  <RegistryCard
    title="TrueForge"
    href="/docs/configuration/registries/trueforge"
    defaultSupport={true}
    description="Public TrueForge OCI image registry support out of the box."
  />
</RegistryGrid>

---

## 🔐 Dedicated Setup Required

These registries host private images or custom infrastructure and **require explicit credentials or endpoint configuration** before WUD can monitor your containers.

<RegistryGrid>
  <RegistryCard
    title="AWS ECR (Private)"
    href="/docs/configuration/registries/ecr"
    defaultSupport={false}
    description="Requires AWS Access Key ID, Secret Access Key, or IAM role credentials to authenticate with private Amazon ECR repositories."
  />

  <RegistryCard
    title="Azure Container Registry (ACR)"
    href="/docs/configuration/registries/acr"
    defaultSupport={false}
    description="Requires an Azure Service Principal Client ID and Client Secret to authenticate against private Azure ACR registries."
  />

  <RegistryCard
    title="Custom / Self-Hosted OCI"
    href="/docs/configuration/registries/custom"
    defaultSupport={false}
    description="Generic provider for standalone Docker Registry v2 instances."
  />

  <RegistryCard
    title="Gitea"
    href="/docs/configuration/registries/gitea"
    defaultSupport={false}
    description="Requires your Gitea instance URL and an access token to inspect private or self-hosted Gitea package registries."
  />

  <RegistryCard
    title="GitLab"
    href="/docs/configuration/registries/gitlab"
    defaultSupport={false}
    description="Requires a GitLab Personal Access Token or Deploy Token. Supports both gitlab.com and self-hosted GitLab CE/EE instances."
  />

  <RegistryCard
    title="Harbor"
    href="/docs/configuration/registries/harbor"
    defaultSupport={false}
    description="Requires your CNCF Harbor instance URL and optional robot account or user credentials."
  />

  <RegistryCard
    title="Inedo ProGet"
    href="/docs/configuration/registries/proget"
    defaultSupport={false}
    description="Requires your Inedo ProGet feed URL and API key or user credentials."
  />

  <RegistryCard
    title="Linode (Akamai)"
    href="/docs/configuration/registries/linode"
    defaultSupport={false}
    description="Requires your Linode / LKE private registry URL and access credentials."
  />

  <RegistryCard
    title="Sonatype Nexus"
    href="/docs/configuration/registries/nexus"
    defaultSupport={false}
    description="Requires your Sonatype Nexus Repository Docker connector URL and credentials."
  />
</RegistryGrid>
