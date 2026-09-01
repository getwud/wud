// Google fonts
import "@fontsource/inter";
import "@/assets/css/typography.scss";

// Material design icons
import "@mdi/font/css/materialdesignicons.css";

// Font-awesome
import "@fortawesome/fontawesome-free/css/all.css";

import { createVuetify as createVuetifyInstance } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "vuetify/styles";

export function createVuetify() {
  return createVuetifyInstance({
    components,
    directives,
    defaults: {
      VCard: {
        loader: false,
        elevation: 0,
        rounded: 'lg',
        class: 'border'
      },
      VBtn: {
        rounded: 'lg',
      },
      VDataTable: {
        hover: true,
      }
    },
    theme: {
      defaultTheme: "light",
      themes: {
        light: {
          dark: false,
          colors: {
            primary: "#2563eb", // Royal Blue
            secondary: "#3b82f6", // Vibrant Blue
            accent: "#0284c7", // Cyan / Sky Accent (doc match)
            info: "#0284c7",
            error: "#ef4444", // Coral Red
            success: "#10b981", // Emerald
            warning: "#f59e0b", // Amber
            background: "#f8fafc",
            surface: "#ffffff",
          },
        },
        dark: {
          dark: true,
          colors: {
            primary: "#3b82f6", // Vibrant Blue
            secondary: "#60a5fa", // Sky Blue
            accent: "#38bdf8", // Electric Cyan Accent (doc match)
            info: "#38bdf8",
            error: "#f87171", // Coral Red 400
            success: "#34d399", // Emerald 400
            warning: "#fbbf24", // Amber 400
            background: "#0a0e17", // Deep Space Navy (doc match)
            surface: "#0f172a", // Slate 900
          },
        },
      },
    },
  });
}
