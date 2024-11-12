<template>
  <v-card>
    <v-app-bar
      flat
      dense
      tile
      @click="collapseDetail()"
      style="cursor: pointer"
    >
      <v-toolbar-title class="text-body-3">
        <v-chip label color="info" outlined disabled
          ><v-icon left v-if="$vuetify.breakpoint.mdAndUp">mdi-update</v-icon
          >{{ container.watcher }}
        </v-chip>
        /
        <span v-if="$vuetify.breakpoint.mdAndUp && !selfhstContainerIconUrl">
          <v-chip label color="info" outlined disabled
            ><v-icon left v-if="$vuetify.breakpoint.mdAndUp">{{
              registryIcon
            }}</v-icon
            >{{ container.image.registry.name }}
          </v-chip>
          /
        </span>
        <v-chip label color="info" outlined disabled>
          <span v-if="$vuetify.breakpoint.mdAndUp">
            <img
              :src="selfhstContainerIconUrl"
              style="width: 24px; height: 24px"
              class="v-icon v-icon--left"
              v-if="isSelfhstContainerIcon"
            />
            <v-icon left v-else>
              {{ containerIcon }}
            </v-icon>
          </span>
          {{ container.displayName }}
        </v-chip>
        <span v-if="$vuetify.breakpoint.mdAndUp">
          :
          <v-chip label outlined color="info" disabled>
            {{ container.image.tag.value }}
          </v-chip>
        </span>
      </v-toolbar-title>
      <v-spacer />
      <v-chip
        v-if="(container.install === true || container.install === 'multiple') && container.updateAvailable"
        label
        color="success"
        outlined
        @click.stop="installContainer"
        class="mr-1"
      >
        Install
      </v-chip>
      <v-tooltip bottom v-if="$vuetify.breakpoint.mdAndUp">
        <template v-slot:activator="{ on, attrs }">
          <v-chip
            v-if="container.updateAvailable"
            label
            outlined
            :color="newVersionClass"
            v-bind="attrs"
            v-on="on"
            @click="
              copyToClipboard('container new version', newVersion);
              $event.stopImmediatePropagation();
            "
          >
            {{ newVersion }}
            <v-icon right small>mdi-clipboard-outline</v-icon>
          </v-chip>
        </template>
        <span class="text-caption">Copy to clipboard</span>
      </v-tooltip>
      <v-icon>{{ showDetail ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
    </v-app-bar>
    <v-expand-transition>
      <div v-show="showDetail">
        <v-tabs
          :icons-and-text="$vuetify.breakpoint.mdAndUp"
          fixed-tabs
          v-model="tab"
          ref="tabs"
        >
          <v-tab>
            <span v-if="$vuetify.breakpoint.mdAndUp">Container</span>
            <img
              :src="selfhstContainerIconUrl"
              style="width: 24px; height: 24px"
              class="v-icon v-icon--left"
              v-if="isSelfhstContainerIcon"
            />
            <v-icon left v-else>
              {{ containerIcon }}
            </v-icon>
          </v-tab>
          <v-tab>
            <span v-if="$vuetify.breakpoint.mdAndUp">Image</span>
            <v-icon>mdi-package-variant-closed</v-icon>
          </v-tab>
          <v-tab v-if="container.result">
            <span v-if="$vuetify.breakpoint.mdAndUp">Update</span>
            <v-icon>mdi-package-down</v-icon>
          </v-tab>
          <v-tab v-if="container.error">
            <span v-if="$vuetify.breakpoint.mdAndUp">Error</span>
            <v-icon>mdi-alert</v-icon>
          </v-tab>
        </v-tabs>

        <v-tabs-items v-model="tab">
          <v-tab-item>
            <container-detail :container="container" />
          </v-tab-item>
          <v-tab-item>
            <container-image :image="container.image" />
          </v-tab-item>
          <v-tab-item v-if="container.result">
            <container-update
              :result="container.result"
              :semver="container.image.tag.semver"
              :update-kind="container.updateKind"
              :update-available="container.updateAvailable"
            />
          </v-tab-item>
          <v-tab-item v-if="container.error">
            <container-error :error="container.error" />
          </v-tab-item>
        </v-tabs-items>

        <v-card-actions>
          <v-row>
            <v-col class="text-center">
              <v-dialog v-model="dialogDelete" width="500" v-if="deleteEnabled">
                <template v-slot:activator="{ on, attrs }">
                  <v-btn small color="error" outlined v-bind="attrs" v-on="on">
                    Delete
                    <v-icon right>mdi-delete</v-icon>
                  </v-btn>
                </template>

                <v-card class="text-center">
                  <v-app-bar color="error" dark flat dense>
                    <v-toolbar-title class="text-body-1">
                      Delete the container?
                    </v-toolbar-title>
                  </v-app-bar>
                  <v-card-subtitle class="text-body-2">
                    <v-row class="mt-2" no-gutters>
                      <v-col>
                        Delete
                        <span class="font-weight-bold error--text">{{
                          container.name
                        }}</span>
                        from the list?
                        <br />
                        <span class="font-italic"
                          >(The real container won't be deleted)</span
                        >
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col class="text-center">
                        <v-btn outlined @click="dialogDelete = false" small>
                          Cancel
                        </v-btn>
                        &nbsp;
                        <v-btn
                          color="error"
                          small
                          @click="
                            dialogDelete = false;
                            deleteContainer();
                          "
                        >
                          Delete
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-card-subtitle>
                </v-card>
              </v-dialog>
            </v-col>
          </v-row>
        </v-card-actions>
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script>
import axios from 'axios';
import ContainerDetail from "@/components/ContainerDetail";
import ContainerImage from "@/components/ContainerImage";
import ContainerUpdate from "@/components/ContainerUpdate";
import ContainerError from "@/components/ContainerError";
import { getRegistryProviderIcon } from "@/services/registry";

export default {
  components: {
    ContainerDetail,
    ContainerImage,
    ContainerUpdate,
    ContainerError,
  },

  props: {
    container: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      showDetail: false,
      dialogDelete: false,
      tab: 0,
      deleteEnabled: false,
    };
  },
  computed: {
    containerIcon() {
      let icon = this.container.displayIcon;
      icon = icon
        .replace("mdi:", "mdi-")
        .replace("fa:", "fa-")
        .replace("fab:", "fab-")
        .replace("far:", "far-")
        .replace("fas:", "fas-")
        .replace("si:", "si-");
      if (icon.startsWith("fab-")) {
        icon = this.normalizeFontawesome(icon, "fab");
      }
      if (icon.startsWith("far-")) {
        icon = this.normalizeFontawesome(icon, "far");
      }
      if (icon.startsWith("fas-")) {
        icon = this.normalizeFontawesome(icon, "fas");
      }
      return icon;
    },

    isSelfhstContainerIcon() {
      console.log(this.container.displayIcon);
      return (
        this.container.displayIcon.startsWith("sh-") ||
        this.container.displayIcon.startsWith("sh:")
      );
    },

    selfhstContainerIconUrl() {
      const iconName = this.container.displayIcon
        .replace("sh-", "")
        .replace("sh:", "");
      return `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${iconName}.png`;
    },

    registryIcon() {
      return getRegistryProviderIcon(this.container.image.registry.name);
    },

    osIcon() {
      let icon = "mdi-help";
      switch (this.container.image.os) {
        case "linux":
          icon = "mdi-linux";
          break;
        case "windows":
          icon = "mdi-microsoft-windows";
          break;
      }
      return icon;
    },

    newVersion() {
      let newVersion = "unknown";
      if (
        this.container.result.created &&
        this.container.image.created !== this.container.result.created
      ) {
        newVersion = this.$options.filters.date(this.container.result.created);
      }
      if (this.container.updateKind) {
        newVersion = this.container.updateKind.remoteValue;
      }
      if (this.container.updateKind.kind === "digest") {
        newVersion = this.$options.filters.short(newVersion, 15);
      }
      return newVersion;
    },

    newVersionClass() {
      let color = "warning";
      if (
        this.container.updateKind &&
        this.container.updateKind.kind === "tag"
      ) {
        switch (this.container.updateKind.semverDiff) {
          case "major":
            color = "error";
            break;
          case "minor":
            color = "warning";
            break;
          case "patch":
            color = "success";
            break;
        }
      }
      return color;
    },
  },

  methods: {
    async deleteContainer() {
      this.$emit("delete-container");
    },

    copyToClipboard(kind, value) {
      this.$clipboard(value);
      this.$root.$emit("notify", `${kind} copied to clipboard`);
    },

    collapseDetail() {
      // Prevent collapse when selecting text only
      if (window.getSelection().type !== "Range") {
        this.showDetail = !this.showDetail;
      }

      // Hack because of a render bu on tabs inside a collapsible element
      this.$refs.tabs.onResize();
    },

    normalizeFontawesome(iconString, prefix) {
      return `${prefix} fa-${iconString.replace(`${prefix}:`, "")}`;
    },

  async installContainer() {
    if (this.container.install === 'multiple') {
      // Display specific message to the user
      this.$root.$emit(
        'notify',
        'Multiple install triggers are configured. Please ensure only one trigger has install enabled.',
        'error'
      );
      return; // Do not proceed with the HTTP request
    }

    try {
      const response = await axios.post(`/api/containers/${this.container.id}/install`);
      console.log(`Installation triggered for ${this.container.displayName}`, response.data);
      this.$root.$emit(
        'notify',
        `Installation triggered for ${this.container.displayName}`,
        'success'
      );
    } catch (error) {
      console.error(`Failed to install ${this.container.displayName}:`, error);

      // Extract the error message from the server response
      let errorMessage = 'Unknown error';
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.statusText;
      } else if (error.request) {
        errorMessage = 'No response received from server';
      } else {
        errorMessage = error.message;
      }

      this.$root.$emit(
        'notify',
        `Failed to install ${this.container.displayName}: ${errorMessage}`,
        'error'
      );
    }
  },
},

  mounted() {
    this.deleteEnabled = this.$serverConfig.feature.delete;
  },
};
</script>

<style scoped>
.v-chip--disabled {
  opacity: 1;
  pointer-events: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>
