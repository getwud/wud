# ECR (Amazon Elastic Container Registry)

![logo](ecr.png)

The `ecr` registry module lets you authenticate against [Amazon Elastic Container Registry (ECR)](https://aws.amazon.com/ecr/).

### Variables

| Env var                                            |    Required    | Description                                                                  | Supported values                                                                                  | Default value when missing |
| -------------------------------------------------- | :------------: | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------- |
| `WUD_REGISTRY_ECR_{registry_name}_REGION`          |  :red_circle:  | AWS Region Code                                                              | [AWS Region list](https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints)    |                            |
| `WUD_REGISTRY_ECR_{registry_name}_ACCESSKEYID`     |  :red_circle:  | AWS Access Key ID                                                            | [AWS Credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html)          |                            |
| `WUD_REGISTRY_ECR_{registry_name}_SECRETACCESSKEY` |  :red_circle:  | AWS Secret Access Key                                                        | [AWS Credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html)          |                            |
| `WUD_REGISTRY_ECR_{registry_name}_ACCOUNTID`       | :white_circle: | AWS Account ID (used to filter when multiple accounts are configured)        | Numeric string                                                                                    | Derived from image name    |
| `WUD_REGISTRY_ECR_{registry_name}_PUBLIC`          | :white_circle: | Whether the registry is an ECR Public gallery                                | `true`, `false`                                                                                   | `false`                    |

!> Ensure the `AmazonEC2ContainerRegistryReadOnly` policy (or equivalent permissions) is attached to the IAM user.

### Examples

#### Authenticate with private ECR repository

<!-- tabs:start -->

#### **Docker Compose**

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

#### **Docker**

```bash
docker run \
  -e WUD_REGISTRY_ECR_PRIVATE_ACCESSKEYID="AKIAIOSFODNN7EXAMPLE" \
  -e WUD_REGISTRY_ECR_PRIVATE_SECRETACCESSKEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
  -e WUD_REGISTRY_ECR_PRIVATE_REGION="eu-west-1" \
  ...
  getwud/wud
```

<!-- tabs:end -->

### How to create an AWS IAM user for ECR access

#### 1. Open the [AWS IAM Console](https://console.aws.amazon.com/iam) and create a new IAM user

![image](ecr_01.png)

#### 2. Attach the `AmazonEC2ContainerRegistryReadOnly` policy to the user

![image](ecr_02.png)

#### 3. Generate an Access Key ID and Secret Access Key, then configure WUD with them

![image](ecr_03.png)

