// Google fonts
import "@fontsource/roboto";

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
      },
    },
    theme: {
      defaultTheme: "light",
      themes: {
        light: {
          dark: false,
          colors: {
            primary: "#00355E",
            secondary: "#0096C7",
            accent: "#06D6A0",
            error: "#E53935",
            info: "#2196F3",
            success: "#4CAF50",
            warning: "#FF9800",
          },
        },
        dark: {
          dark: true,
          colors: {
            primary: "#00355E",
            secondary: "#0096C7",
            accent: "#06D6A0",
            error: "#E53935",
          },
        },
      },
    },
  });
}
