<template>
  <div>
    <div
      v-if="
        this.groupingLabel &&
        this.previousContainer?.labels?.[this.groupingLabel] !==
          this.container.labels?.[this.groupingLabel]
      "
    >
      <div class="text-h6">
        {{ this.groupingLabel }} =
        {{ this.container.labels?.[this.groupingLabel] ?? "(empty)" }}
      </div>
      <v-divider class="pb-3"></v-divider>
    </div>
    <v-card>
      <v-app-bar
        flat
        dense
        tile
        @click="collapseDetail()"
        style="cursor: pointer"
      >
        <v-toolbar-title
          class="text-body-3 d-flex align-center"
          style="gap: 5px"
        >
          <span v-if="$vuetify.breakpoint.smAndUp">
            <v-chip label color="info" outlined disabled>
              <v-icon left>mdi-update</v-icon>
              {{ container.watcher }}
            </v-chip>
            /
          </span>
          <span v-if="$vuetify.breakpoint.mdAndUp">
            <v-chip label color="info" outlined disabled>
              <v-icon left v-if="$vuetify.breakpoint.smAndUp">{{
                registryIcon
              }}</v-icon>
              {{ container.image.registry.name }}
            </v-chip>
            /
          </span>
          <v-chip label color="info" outlined disabled>
            <span v-if="$vuetify.breakpoint.smAndUp">
              <img
                :src="
                  isHomarrContainerIcon
                    ? homarrContainerIconUrl
                    : selfhstContainerIconUrl
                "
                style="width: 24px; height: 24px"
                class="v-icon v-icon--left"
                v-if="isHomarrContainerIcon || isSelfhstContainerIcon"
              />
              <v-icon left v-else>
                {{ containerIcon }}
              </v-icon>
            </span>
            <span style="overflow: hidden; text-overflow: ellipsis">
              {{ container.displayName }}
            </span>
          </v-chip>
          <span>
            :
            <v-chip label outlined color="info" disabled>
              {{ container.image.tag.value }}
            </v-chip>
          </span>
        </v-toolbar-title>
        <span v-if="$vuetify.breakpoint.smAndUp && container.updateAvailable">
          <v-icon>mdi-arrow-right</v-icon>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-chip
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
        </span>

        <v-spacer />
        <span
          v-if="$vuetify.breakpoint.smAndUp && oldestFirst"
          class="text-caption ml-2"
        >
          {{ this.$options.filters.date(container.image.created) }}
        </span>

        <v-icon>{{
          showDetail ? "mdi-chevron-up" : "mdi-chevron-down"
        }}</v-icon>
      </v-app-bar>
      <v-expand-transition>
        <div v-show="showDetail">
          <v-tabs
            :icons-and-text="$vuetify.breakpoint.smAndUp"
            fixed-tabs
            v-model="tab"
            ref="tabs"
          >
            <v-tab v-if="container.result">
              <span v-if="$vuetify.breakpoint.smAndUp">Update</span>
              <v-icon>mdi-package-down</v-icon>
            </v-tab>
            <v-tab>
              <span v-if="$vuetify.breakpoint.smAndUp">Triggers</span>
              <v-icon>mdi-bell-ring</v-icon>
            </v-tab>
            <v-tab>
              <span v-if="$vuetify.breakpoint.smAndUp">Image</span>
              <v-icon>mdi-package-variant-closed</v-icon>
            </v-tab>
            <v-tab>
              <span v-if="$vuetify.breakpoint.smAndUp">Container</span>
              <img
                :src="
                  isHomarrContainerIcon
                    ? homarrContainerIconUrl
                    : selfhstContainerIconUrl
                "
                style="width: 24px; height: 24px"
                class="v-icon v-icon--left"
                v-if="isHomarrContainerIcon || isSelfhstContainerIcon"
              />
              <v-icon left v-else>
                {{ containerIcon }}
              </v-icon>
            </v-tab>
            <v-tab v-if="container.error">
              <span v-if="$vuetify.breakpoint.smAndUp">Error</span>
              <v-icon>mdi-alert</v-icon>
            </v-tab>
          </v-tabs>

          <v-tabs-items v-model="tab">
            <v-tab-item v-if="container.result">
              <container-update
                :result="container.result"
                :semver="container.image.tag.semver"
                :update-kind="container.updateKind"
                :update-available="container.updateAvailable"
              />
            </v-tab-item>
            <v-tab-item>
              <container-triggers :container="container" />
            </v-tab-item>
            <v-tab-item>
              <container-image :image="container.image" />
            </v-tab-item>
            <v-tab-item>
              <container-detail :container="container" />
            </v-tab-item>
            <v-tab-item v-if="container.error">
              <container-error :error="container.error" />
            </v-tab-item>
          </v-tabs-items>

          <v-card-actions>
            <v-row>
              <v-col class="text-center">
                <v-dialog
                  v-model="dialogDelete"
                  width="500"
                  v-if="deleteEnabled"
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      small
                      color="error"
                      outlined
                      v-bind="attrs"
                      v-on="on"
                    >
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
  </div>
</template>

<script>
import { getRegistryProviderIcon } from "@/services/registry";
import ContainerDetail from "@/components/ContainerDetail";
import ContainerError from "@/components/ContainerError";
import ContainerImage from "@/components/ContainerImage";
import ContainerTriggers from "@/components/ContainerTriggers";
import ContainerUpdate from "@/components/ContainerUpdate";

export default {
  components: {
    ContainerDetail,
    ContainerError,
    ContainerImage,
    ContainerTriggers,
    ContainerUpdate,
  },

  props: {
    container: {
      type: Object,
      required: true,
    },
    previousContainer: {
      type: Object,
      required: false,
    },
    groupingLabel: {
      type: String,
      required: true,
    },
    oldestFirst: {
      type: Boolean,
      required: false,
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
      return (
        this.container.displayIcon.startsWith("sh-") ||
        this.container.displayIcon.startsWith("sh:")
      );
    },

    isHomarrContainerIcon() {
      return (
        this.container.displayIcon.startsWith("hl-") ||
        this.container.displayIcon.startsWith("hl:")
      );
    },

    selfhstContainerIconUrl() {
      const iconName = this.container.displayIcon
        .replace("sh-", "")
        .replace("sh:", "");
      return `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${iconName}.png`;
    },

    homarrContainerIconUrl() {
      const iconName = this.container.displayIcon
        .replace("hl-", "")
        .replace("hl:", "");
      return `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${iconName}.png`;
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
        newVersion = this.$options.filters.dateTime(
          this.container.result.created,
        );
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
