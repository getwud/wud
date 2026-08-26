import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ECR (Amazon Elastic Container Registry)

![logo](ecr.svg)

The `ecr` registry module lets you authenticate against [Amazon Elastic Container Registry (ECR)](https://aws.amazon.com/ecr/).

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_ECR_{registry_name}_ACCESSKEYID"
    required={true}
    type="url"
    supported="[AWS Credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html)">
    AWS Access Key ID
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ECR_{registry_name}_REGION"
    required={true}
    type="url"
    supported="[AWS Region list](https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints)">
    AWS Region Code
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ECR_{registry_name}_SECRETACCESSKEY"
    required={true}
    type="url"
    supported="[AWS Credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html)">
    AWS Secret Access Key
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_ECR_{registry_name}_ACCOUNTID"
    required={false}
    type="string"
    defaultValue="Derived from image name"
    supported="Numeric string">
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
:::warning[Ensure the `AmazonEC2ContainerRegistryReadOnly` policy (or equivalent permissions) is attached to the IAM user.]
:::

### Examples

#### Authenticate with private ECR repository

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
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
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### How to create an AWS IAM user for ECR access

#### 1. Open the [AWS IAM Console](https://console.aws.amazon.com/iam) and create a new IAM user

![image](ecr_01.png)

#### 2. Attach the `AmazonEC2ContainerRegistryReadOnly` policy to the user

![image](ecr_02.png)

#### 3. Generate an Access Key ID and Secret Access Key, then configure WUD with them

![image](ecr_03.png)
