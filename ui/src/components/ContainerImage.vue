<template>
  <v-list dense>
    <v-list-item>
      <v-list-item-avatar>
        <v-icon color="secondary">mdi-identifier</v-icon>
      </v-list-item-avatar>
      <v-list-item-content>
        <v-list-item-title>
          Id
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                icon
                x-small
                v-bind="attrs"
                v-on="on"
                @click="copyToClipboard('image id', image.id)"
              >
                <v-icon>mdi-clipboard</v-icon>
              </v-btn>
            </template>
            <span class="text-caption">Copy to clipboard</span>
          </v-tooltip>
        </v-list-item-title>
        <v-list-item-subtitle>{{ image.id }}</v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
    <v-list-item>
      <v-list-item-avatar>
        <v-icon color="secondary">mdi-pencil</v-icon>
      </v-list-item-avatar>
      <v-list-item-content>
        <v-list-item-title>Name</v-list-item-title>
        <v-list-item-subtitle>{{ image.name }}</v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
    <v-list-item>
      <v-list-item-avatar>
        <v-icon color="secondary">{{ registryIcon }}</v-icon>
      </v-list-item-avatar>
      <v-list-item-content>
        <v-list-item-title>Registry name</v-list-item-title>
        <v-list-item-subtitle>{{ image.registry.name }}</v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-content>
        <v-list-item-title>Registry url</v-list-item-title>
        <v-list-item-subtitle>{{ image.registry.url }}</v-list-item-subtitle>
        <v-list-item-subtitle v-if="image.registry.lookupImage">{{ image.registry.lookupImage }} (lookup)</v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
    <v-list-item>
      <v-list-item-avatar>
        <v-icon color="secondary">mdi-tag</v-icon>
      </v-list-item-avatar>
      <v-list-item-content>
        <v-list-item-title>
          Tag &nbsp;<v-chip v-if="image.tag.semver" x-small label outlined
            >semver</v-chip
          >
        </v-list-item-title>
        <v-list-item-subtitle>
          {{ image.tag.value }}
        </v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
    <v-list-item v-if="image.digest.value">
      <v-list-item-avatar>
        <v-icon color="secondary">mdi-function-variant</v-icon>
      </v-list-item-avatar>
      <v-list-item-content>
        <v-list-item-title>
          Digest
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                icon
                x-small
                v-bind="attrs"
                v-on="on"
                @click="copyToClipboard('image digest', image.digest.value)"
              >
                <v-icon>mdi-clipboard</v-icon>
              </v-btn>
            </template>
            <span class="text-caption">Copy to clipboard</span>
          </v-tooltip>
        </v-list-item-title>
        <v-list-item-subtitle>
          {{ image.digest.value }}
        </v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
    <v-list-item>
      <v-list-item-avatar>
        <v-icon color="secondary">{{ osIcon }}</v-icon>
      </v-list-item-avatar>
      <v-list-item-content>
        <v-list-item-title>OS / Architecture</v-list-item-title>
        <v-list-item-subtitle
          >{{ image.os }} / {{ image.architecture }}</v-list-item-subtitle
        >
      </v-list-item-content>
    </v-list-item>
    <v-list-item v-if="image.created">
      <v-list-item-avatar>
        <v-icon color="secondary">mdi-calendar</v-icon>
      </v-list-item-avatar>
      <v-list-item-content>
        <v-list-item-title>Created</v-list-item-title>
        <v-list-item-subtitle>{{ image.created | date }}</v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
  </v-list>
</template>

<script>
import { getRegistryProviderIcon } from "@/services/registry";

export default {
  props: {
    image: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {};
  },
  computed: {
    registryIcon() {
      return getRegistryProviderIcon(this.image.registry.name);
    },

    osIcon() {
      let icon = "mdi-help";
      switch (this.image.os) {
        case "linux":
          icon = "mdi-linux";
          break;
        case "windows":
          icon = "mdi-microsoft-windows";
          break;
      }
      return icon;
    },
  },

  methods: {
    copyToClipboard(kind, value) {
      this.$clipboard(value);
      this.$root.$emit("notify", `${kind} copied to clipboard`);
    },
  },
};
</script>
