<template>
  <img
    v-if="isImageUrl && !hasImageError"
    :src="icon"
    class="icon-renderer icon-image"
    alt=""
    loading="lazy"
    :style="iconStyle"
    @error="onImageError"
  />
  <Icon
    v-else-if="normalizedIcon"
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

  data() {
    return {
      hasImageError: false,
    };
  },

  watch: {
    icon() {
      this.hasImageError = false;
    },
  },

  computed: {
    isImageUrl(): boolean {
      if (!this.icon) return false;

      const iconName = this.icon.trim().toLowerCase();
      return (
        iconName.startsWith("http://") ||
        iconName.startsWith("https://") ||
        iconName.startsWith("data:image/")
      );
    },

    normalizedIcon(): string {
      if (!this.icon) return "";

      if (this.isImageUrl) {
        return this.hasImageError ? "mdi:docker" : "";
      }

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

    iconStyle(): Record<string, string> {
      return {
        width: `${this.size}px`,
        height: `${this.size}px`,
        marginRight: `${this.marginRight}px`,
        display: "inline-block",
        verticalAlign: "middle",
        objectFit: "contain",
      };
    },
  },

  methods: {
    onImageError() {
      this.hasImageError = true;
    },
  },
});
</script>

<style scoped>
.icon-renderer {
  display: inline-block;
  vertical-align: middle;
}

.icon-image {
  object-fit: contain;
}
</style>
