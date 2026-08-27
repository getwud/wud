---
title: AWS Elastic Container Registry (ECR)
description: Configure authentication for Amazon ECR Private and Public Registries in What's Up Docker (WUD).
---

import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# AWS Elastic Container Registry (ECR)

![logo](ecr.svg)

The `ecr` registry module lets you authenticate against [Amazon Elastic Container Registry (ECR)](https://aws.amazon.com/ecr/) private and public repositories.

:::info[Zero-Config for ECR Public]
Public images on Amazon ECR Public Gallery (`public.ecr.aws`) work out of the box with zero configuration. Configure this module to authenticate against private ECR repositories.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_ECR_{registry_name}_ACCESSKEYID"
    required={true}
    type="string"
    supported="[AWS Access Key ID](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html)">
    AWS IAM Access Key ID
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ECR_{registry_name}_SECRETACCESSKEY"
    required={true}
    type="string"
    supported="[AWS Secret Access Key](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html)">
    AWS IAM Secret Access Key
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ECR_{registry_name}_REGION"
    required={true}
    type="string"
    supported="[AWS Region Code](https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints) (e.g. `us-east-1`, `eu-west-1`)">
    AWS Region Code
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ECR_{registry_name}_ACCOUNTID"
    required={false}
    type="string"
    defaultValue="Derived from image name"
    supported="12-digit numeric string">
    AWS Account ID (used to filter when multiple accounts are configured)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ECR_{registry_name}_PUBLIC"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether the registry is an ECR Public gallery
  </ConfigOption>
</ConfigList>

:::warning[Required IAM Policy]
Ensure the `AmazonEC2ContainerRegistryReadOnly` policy (or equivalent `ecr:GetAuthorizationToken`, `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer` permissions) is attached to the IAM user.
:::

---

## 🚀 Examples

### Authenticate with Private AWS ECR

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_ECR_PRIVATE_ACCESSKEYID=AKIAIOSFODNN7EXAMPLE
      - WUD_REGISTRY_ECR_PRIVATE_SECRETACCESSKEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
      - WUD_REGISTRY_ECR_PRIVATE_REGION=eu-west-1
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_ECR_PRIVATE_ACCESSKEYID="AKIAIOSFODNN7EXAMPLE" \
  -e WUD_REGISTRY_ECR_PRIVATE_SECRETACCESSKEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
  -e WUD_REGISTRY_ECR_PRIVATE_REGION="eu-west-1" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Creating an AWS IAM User for ECR

### 1. Create an IAM User
Open the [AWS IAM Console](https://console.aws.amazon.com/iam) and create a new IAM user.

![image](ecr_01.png)

### 2. Attach the Read-Only Policy
Attach the `AmazonEC2ContainerRegistryReadOnly` managed policy to the user.

![image](ecr_02.png)

### 3. Generate Access Keys
Create an **Access Key** under **Security credentials**, and copy the Access Key ID and Secret Access Key.

![image](ecr_03.png)
