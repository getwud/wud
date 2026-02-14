import { ref, onMounted, defineComponent } from "vue";
import { useTheme } from "vuetify";
import { getContainerIcon } from "@/services/container";
import { getRegistryIcon } from "@/services/registry";
import { getTriggerIcon } from "@/services/trigger";
import { getServerIcon } from "@/services/server";
import { getWatcherIcon } from "@/services/watcher";
import { getAuthenticationIcon } from "@/services/authentication";

export default defineComponent({
  setup() {
    const theme = useTheme();
    const mini = ref(true);
    const darkMode = ref(localStorage.darkMode === "true");
    
    const configurationItems = [
      {
        to: "/configuration/authentications",
        name: "auth",
        icon: getAuthenticationIcon(),
      },
      {
        to: "/configuration/registries",
        name: "registries",
        icon: getRegistryIcon(),
      },
      {
        to: "/configuration/triggers",
        name: "triggers",
        icon: getTriggerIcon(),
      },
      {
        to: "/configuration/watchers",
        name: "watchers",
        icon: getWatcherIcon(),
      },
      {
        to: "/configuration/server",
        name: "server",
        icon: getServerIcon(),
      },
    ];

    const toggleDarkMode = (value: boolean) => {
      darkMode.value = value;
      localStorage.darkMode = String(darkMode.value);
      theme.global.name.value = darkMode.value ? "dark" : "light";
    };

    onMounted(() => {
      theme.global.name.value = darkMode.value ? "dark" : "light";
    });

    return {
      mini,
      darkMode,
      containerIcon: getContainerIcon(),
      configurationItems,
      toggleDarkMode,
    };
  },

  computed: {
    configurationItemsSorted() {
      return [...this.configurationItems].sort((item1, item2) =>
        item1.name.localeCompare(item2.name),
      );
    },
  },
});
