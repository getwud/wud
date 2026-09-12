import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/reference/wud-rest-api",
    },
    {
      type: "category",
      label: "Authentication",
      link: {
        type: "doc",
        id: "api/reference/authentication",
      },
      items: [
        {
          type: "doc",
          id: "api/reference/get-strategies",
          label: "Get authentication strategies",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reference/login",
          label: "Login user",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reference/logout",
          label: "Logout user",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reference/get-user",
          label: "Get current user",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reference/get-authentications",
          label: "Get all authentication providers",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reference/get-authentication",
          label: "Get specific authentication provider",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Containers",
      link: {
        type: "doc",
        id: "api/reference/containers",
      },
      items: [
        {
          type: "doc",
          id: "api/reference/get-containers",
          label: "Get all containers",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reference/watch-containers",
          label: "Watch all containers",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reference/get-container",
          label: "Get container by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reference/delete-container",
          label: "Delete container",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/reference/watch-container",
          label: "Watch a specific container",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/reference/get-container-triggers",
          label: "Get triggers for a container",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reference/run-trigger-for-container",
          label: "Run a specific trigger on a container",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Triggers",
      link: {
        type: "doc",
        id: "api/reference/triggers",
      },
      items: [
        {
          type: "doc",
          id: "api/reference/get-triggers",
          label: "Get all triggers",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reference/get-trigger",
          label: "Get specific trigger",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reference/run-trigger",
          label: "Run specific trigger",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Watchers",
      link: {
        type: "doc",
        id: "api/reference/watchers",
      },
      items: [
        {
          type: "doc",
          id: "api/reference/get-watchers",
          label: "Get all watchers",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reference/get-watcher",
          label: "Get specific watcher",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Registries",
      link: {
        type: "doc",
        id: "api/reference/registries",
      },
      items: [
        {
          type: "doc",
          id: "api/reference/get-registries",
          label: "Get all registries",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/reference/get-registry",
          label: "Get specific registry",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "App",
      link: {
        type: "doc",
        id: "api/reference/app",
      },
      items: [
        {
          type: "doc",
          id: "api/reference/get-app-infos",
          label: "Get application info",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Server",
      link: {
        type: "doc",
        id: "api/reference/server",
      },
      items: [
        {
          type: "doc",
          id: "api/reference/get-server",
          label: "Get server configuration",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Store",
      link: {
        type: "doc",
        id: "api/reference/store",
      },
      items: [
        {
          type: "doc",
          id: "api/reference/get-store",
          label: "Get store configuration",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Logs",
      link: {
        type: "doc",
        id: "api/reference/logs",
      },
      items: [
        {
          type: "doc",
          id: "api/reference/get-log",
          label: "Get logs",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
