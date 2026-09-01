<template>
  <div class="configuration-drawer-content pa-4">
    <!-- Item Header Summary -->
    <div class="d-flex align-center mb-4 pa-3 rounded-lg bg-surface border">
      <IconRenderer
        v-if="item.icon"
        :icon="item.icon"
        :size="36"
        :margin-right="12"
        class="flex-shrink-0"
      />
      <v-icon
        v-else-if="fallbackIcon"
        :icon="fallbackIcon"
        size="36"
        class="mr-3 text-primary flex-shrink-0"
      />
      <div class="overflow-hidden">
        <div class="text-subtitle-1 font-weight-bold text-truncate">
          {{ item.name || item.id }}
        </div>
        <div class="d-flex align-center gap-1 mt-1">
          <v-chip label color="primary" size="x-small" variant="tonal" class="font-weight-medium">
            {{ item.type }}
          </v-chip>
          <span class="text-caption text-grey ml-2" v-if="item.id && item.id !== item.name">
            ID: {{ item.id }}
          </span>
        </div>
      </div>
    </div>

    <!-- Actions Slot (e.g. Test Trigger button) -->
    <div v-if="$slots.actions" class="mb-4">
      <slot name="actions"></slot>
    </div>

    <!-- Configuration Section Header -->
    <div class="d-flex align-center justify-space-between mb-2">
      <span class="text-subtitle-2 font-weight-bold text-medium-emphasis">
        Configuration Parameters
      </span>
      <v-chip size="x-small" variant="outlined" color="grey">
        {{ configurationItems.length }} {{ configurationItems.length === 1 ? 'entry' : 'entries' }}
      </v-chip>
    </div>

    <!-- Configuration Key-Value Table/List -->
    <v-card variant="outlined" rounded="lg" class="bg-surface overflow-hidden">
      <v-list density="compact" v-if="configurationItems.length > 0" class="py-0">
        <template v-for="(cfg, index) in configurationItems" :key="cfg.key">
          <v-list-item class="py-2 px-3">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-bold text-capitalize text-grey-darken-1">
                {{ cfg.key }}
              </span>
              <v-btn
                icon="mdi-content-copy"
                variant="text"
                size="x-small"
                density="compact"
                color="grey"
                class="opacity-60 hover-opacity-100"
                @click.stop="copyValue(cfg.key, cfg.value)"
                title="Copy value"
              ></v-btn>
            </div>
            <div>
              <!-- Boolean Value -->
              <template v-if="typeof cfg.value === 'boolean'">
                <v-chip
                  size="x-small"
                  :color="cfg.value ? 'success' : 'grey'"
                  variant="tonal"
                  label
                  class="font-weight-medium"
                >
                  {{ cfg.value ? 'true' : 'false' }}
                </v-chip>
              </template>
              <!-- Empty / Null Value or Empty Object -->
              <template v-else-if="cfg.value === undefined || cfg.value === null || cfg.value === '' || (typeof cfg.value === 'object' && Object.keys(cfg.value).length === 0)">
                <span class="text-caption text-grey font-italic">&lt;empty&gt;</span>
              </template>
              <!-- Complex Object or Array -->
              <template v-else-if="typeof cfg.value === 'object'">
                <pre class="bg-grey-lighten-4 dark:bg-grey-darken-4 pa-2 rounded text-caption overflow-x-auto my-1">{{ JSON.stringify(cfg.value, null, 2) }}</pre>
              </template>
              <!-- Standard string / number -->
              <template v-else>
                <span class="text-body-2 font-weight-medium text-high-emphasis word-break-all">
                  {{ cfg.value }}
                </span>
              </template>
            </div>
          </v-list-item>
          <v-divider v-if="index < configurationItems.length - 1" />
        </template>
      </v-list>

      <div v-else class="pa-6 text-center text-grey">
        <v-icon size="36" class="mb-2 opacity-50">mdi-tune-variant</v-icon>
        <div class="text-body-2">Default configuration</div>
        <div class="text-caption text-grey">No custom parameters set</div>
      </div>
    </v-card>
  </div>
</template>

<script lang="ts">
import IconRenderer from "@/components/IconRenderer.vue";
import { defineComponent } from "vue";

export default defineComponent({
  name: "ConfigurationDrawerContent",
  components: {
    IconRenderer,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
    fallbackIcon: {
      type: String,
      default: "",
    },
  },
  computed: {
    configurationItems() {
      return this.flattenConfiguration(this.item.configuration || {});
    },
  },
  methods: {
    flattenConfiguration(configObj: any, prefix = ""): Array<{ key: string; value: any }> {
      if (!configObj || typeof configObj !== "object") {
        return [];
      }
      const items: Array<{ key: string; value: any }> = [];
      for (const key of Object.keys(configObj)) {
        const val = configObj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (val !== null && typeof val === "object" && !Array.isArray(val)) {
          if (Object.keys(val).length === 0) {
            items.push({ key: fullKey, value: null });
          } else {
            items.push(...this.flattenConfiguration(val, fullKey));
          }
        } else {
          items.push({ key: fullKey, value: val });
        }
      }
      return items.sort((a, b) => a.key.localeCompare(b.key));
    },
    copyValue(key: string, value: any) {
      const textToCopy =
        value === null || value === undefined
          ? ""
          : typeof value === "object"
          ? JSON.stringify(value, null, 2)
          : String(value);
      navigator.clipboard.writeText(textToCopy);
      (this as any).$eventBus?.emit("notify", `${key} copied to clipboard`);
    },
  },
});
</script>

<style scoped>
.word-break-all {
  word-break: break-word;
}
.hover-opacity-100:hover {
  opacity: 1 !important;
}
</style>
