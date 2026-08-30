import "./public-path";
import { createApp } from "vue";
import App from "./App.vue";
import { createVuetify } from "./plugins/vuetify";
import router from "./router";
import { registerGlobalProperties } from "./filters";
import { useEventBus } from "./composables/useEventBus";
import "./registerServiceWorker";

// Suppress benign ResizeObserver loop errors that trigger webpack dev overlay
window.addEventListener("error", (e) => {
  if (e.message && (e.message.includes("ResizeObserver") || e.message.includes("undelivered notifications"))) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

const app = createApp(App);

// Register global properties (replacing filters)
registerGlobalProperties(app);

// Global event bus
const eventBus = useEventBus();
app.config.globalProperties.$eventBus = eventBus;
app.provide("eventBus", eventBus);

// Use plugins
app.use(createVuetify());
app.use(router);

app.mount("#app");
