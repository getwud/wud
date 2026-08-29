<template>
  <Icon
    v-if="normalizedIcon"
    :icon="normalizedIcon"
    :style="iconStyle"
    :width="size"
    :height="size"
    class="icon-renderer"
    :inline="true"
  />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Icon } from "@iconify/vue";

export default defineComponent({
  name: "IconRenderer",
  components: {
    Icon,
  },
  props: {
    icon: {
      type: String,
      required: true,
      default: "",
    },
    size: {
      type: [String, Number],
      default: 24,
    },
    marginRight: {
      type: [String, Number],
      default: 8,
    },
  },

  computed: {
    normalizedIcon(): string {
      if (!this.icon) return "";

      const iconName = this.icon.trim().toLowerCase();

      // Deprecation warning for Homarr icons: mapped to selfhst
      if (iconName.startsWith("hl-") || iconName.startsWith("hl:")) {
        // eslint-disable-next-line no-console
        console.warn(
          `[WUD] Icon prefix 'hl:'/'hl-' is deprecated and mapped to 'selfhst:'. Please update '${this.icon}' to 'selfhst:${iconName.replace(/^hl[:-]/, "")}' or standard Iconify format.`
        );
        return `selfhst:${iconName.replace(/^hl[:-]/, "")}`;
      }

      if (iconName.startsWith("sh-") || iconName.startsWith("sh:")) {
        return `selfhst:${iconName.replace(/^sh[:-]/, "")}`;
      }

      if (iconName.startsWith("si-") || iconName.startsWith("si:")) {
        return `simple-icons:${iconName.replace(/^si[:-]/, "")}`;
      }

      if (iconName.startsWith("mdi-") || iconName.startsWith("mdi ") || iconName.startsWith("mdi:")) {
        return `mdi:${iconName.replace(/^mdi[- :]/, "")}`;
      }

      if (iconName.startsWith("fa-") || iconName.startsWith("fa ") || iconName.startsWith("fa:")) {
        return `fa6-solid:${iconName.replace(/^fa[- :]/, "")}`;
      }

      if (iconName.startsWith("fab-") || iconName.startsWith("fab:")) {
        return `fa6-brands:${iconName.replace(/^fab[:-]/, "")}`;
      }

      if (iconName.startsWith("far-") || iconName.startsWith("far:")) {
        return `fa6-regular:${iconName.replace(/^far[:-]/, "")}`;
      }

      if (iconName.startsWith("fas-") || iconName.startsWith("fas:")) {
        return `fa6-solid:${iconName.replace(/^fas[:-]/, "")}`;
      }

      // If it already contains a collection prefix (e.g. 'logos:docker', 'mdi:home', 'custom:icon')
      if (iconName.includes(":")) {
        return iconName;
      }

      // Default fallback when no prefix is specified: simple-icons
      return `simple-icons:${iconName}`;
    },

    iconStyle() {
      return {
        width: `${this.size}px`,
        height: `${this.size}px`,
        marginRight: `${this.marginRight}px`,
        display: "inline-block",
        verticalAlign: "middle",
      };
    },
  },
});
</script>

<style scoped>
.icon-renderer {
  display: inline-block;
  vertical-align: middle;
}
</style>