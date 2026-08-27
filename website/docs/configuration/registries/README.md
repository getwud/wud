---
title: Registries
description: Overview of container registry integrations and authentication in What's Up Docker (WUD).
---

import { RegistryGrid, RegistryCard } from '@site/src/components/RegistryCard';

# Registries

WUD inspects remote container registries to discover image tags, digest hashes, and semver updates for your monitored containers.

:::tip[How WUD Resolves Registries]
When WUD monitors a container (e.g. `redis:7-alpine` or `ghcr.io/owner/app:1.2.0`), it parses the image name to detect the target registry domain automatically.
:::

---

## ⚡ Active by Default (Zero-Config for Public Images)

These registries **work out of the box with zero configuration** for public images.

You only need to configure environment variables if you want to:
- Access **private repositories**
- Increase **API rate limits** (e.g. Docker Hub authenticated tier)
- Connect to a **self-hosted instance** (e.g. on-premise Forgejo or Quay)

<RegistryGrid>
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
    title="LinuxServer (LSCR)"
    href="/docs/configuration/registries/lscr"
    defaultSupport={true}
    description="Seamless tag and update monitoring for the entire LinuxServer.io container ecosystem."
  />

  <RegistryCard
    title="Quay"
    href="/docs/configuration/registries/quay"
    defaultSupport={true}
    description="Red Hat Quay public images supported anonymously. Supports custom tokens for private repos and on-prem Quay clusters."
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
    description="Generic provider for Harbor, Sonatype Nexus, JFrog Artifactory, or standalone Docker Registry v2 instances."
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
</RegistryGrid>
