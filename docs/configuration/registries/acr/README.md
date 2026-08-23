# ACR (Azure Container Registry)

![logo](azure.png)

The `acr` registry module lets you authenticate against [Azure Container Registry](https://azure.microsoft.com/en-us/products/container-registry).

### Variables

| Env var                                           | Required       | Description          | Supported values | Default value when missing |
| ------------------------------------------------- |:--------------:| -------------------- | ---------------- | -------------------------- | 
| `WUD_REGISTRY_ACR_{registry_name}_CLIENTID`       | :red_circle:   | Azure Service Principal Client ID | String |                            |
| `WUD_REGISTRY_ACR_{registry_name}_CLIENTSECRET`   | :red_circle:   | Azure Service Principal Client Secret | String |                            |
| `WUD_REGISTRY_ACR_{registry_name}_NAME`           | :white_circle: | Registry domain name (e.g., `myregistry.azurecr.io`) | String | `{registry_name}.azurecr.io` |

?> You can obtain the Client ID and Secret from an Azure Service Principal with the `AcrPull` role assigned ([see Azure documentation](https://learn.microsoft.com/azure/container-registry/container-registry-auth-service-principal)).

### Examples

#### Authenticate with an Azure Container Registry

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_ACR_MYREGISTRY_CLIENTID=00000000-0000-0000-0000-000000000000
      - WUD_REGISTRY_ACR_MYREGISTRY_CLIENTSECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
#### **Docker**
```bash
docker run \
  -e WUD_REGISTRY_ACR_MYREGISTRY_CLIENTID="00000000-0000-0000-0000-000000000000" \
  -e WUD_REGISTRY_ACR_MYREGISTRY_CLIENTSECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  ...
  getwud/wud
```
<!-- tabs:end -->


### How to create Registry credentials on Microsoft Azure Platform

#### Create a Service Principal
Follow the [official Azure documentation](https://docs.microsoft.com/azure/active-directory/develop/howto-create-service-principal-portal).

![image](acr_01.png)

#### Go to your Container Registry and click on the Access Control (IAM) Menu
![image](acr_02.png)

#### Click to Add a role assignment
Select the `AcrPull` role and assign to your Service Principal
![image](acr_03.png)
