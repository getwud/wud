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
      <v-card-title
        @click="collapseDetail()"
        style="cursor: pointer"
        class="pa-3 d-flex align-center bg-surface"
      >
        <div
          class="text-body-3 d-flex align-center"
          style="gap: 5px"
        >
          <span v-if="smAndUp">
            <v-chip label color="info" variant="outlined" disabled>
              <v-icon left>mdi-update</v-icon>
              {{ container.watcher }}
            </v-chip>
            /
          </span>
          <span v-if="mdAndUp">
            <v-chip label color="info" variant="outlined" disabled>
              <IconRenderer 
                v-if="smAndUp" 
                :icon="registryIcon"
                :size="24"
                :margin-right="8"
              />
              {{ container.image.registry.name }}
            </v-chip>
            /
          </span>
          <v-chip label color="info" variant="outlined" disabled>
            <IconRenderer 
              v-if="smAndUp" 
              :icon="container.displayIcon"
              :size="24"
              :margin-right="8"
            />
            <span style="overflow: hidden; text-overflow: ellipsis">
              {{ container.displayName }}
            </span>
          </v-chip>
          <span>
            :
            <v-chip label variant="outlined" color="info" disabled>
              {{ container.image.tag.value }}
            </v-chip>
          </span>
        </div>
        
        <v-spacer />
        
        <div class="d-flex align-center" style="gap: 8px">
          <span v-if="smAndUp && container.updateAvailable" class="d-flex align-center" style="gap: 4px">
            <v-icon>mdi-arrow-right</v-icon>
            <v-tooltip bottom>
              <template v-slot:activator="{ props }">
                <v-chip
                  label
                  variant="outlined"
                  :color="newVersionClass"
                  v-bind="props"
                  @click="
                    copyToClipboard('container new version', newVersion);
                    $event.stopImmediatePropagation();
                  "
                >
                  {{ newVersion }}
                  <v-icon end size="small">mdi-clipboard-outline</v-icon>
                </v-chip>
              </template>
              <span class="text-caption">Copy to clipboard</span>
            </v-tooltip>
          </span>

          <span
            v-if="smAndUp && oldestFirst"
            class="text-caption"
          >
            {{ this.$filters.date(container.image.created) }}
          </span>

          <v-icon>{{
            showDetail ? "mdi-chevron-up" : "mdi-chevron-down"
          }}</v-icon>
        </div>
      </v-card-title>
      <transition name="expand-transition">
        <div v-show="showDetail">
          <v-tabs
            :stacked="smAndUp"
            fixed-tabs
            v-model="tab"
            ref="tabs"
          >
            <v-tab v-if="container.result">
              <span v-if="smAndUp">Update</span>
              <v-icon>mdi-package-down</v-icon>
            </v-tab>
            <v-tab>
              <span v-if="smAndUp">Triggers</span>
              <v-icon>mdi-bell-ring</v-icon>
            </v-tab>
            <v-tab>
              <span v-if="smAndUp">Image</span>
              <v-icon>mdi-package-variant-closed</v-icon>
            </v-tab>
            <v-tab>
              <span v-if="smAndUp">Container</span>
              <IconRenderer 
                :icon="container.displayIcon"
                :size="24"
                :margin-right="8"
              />
            </v-tab>
            <v-tab v-if="container.error">
              <span v-if="smAndUp">Error</span>
              <v-icon>mdi-alert</v-icon>
            </v-tab>
          </v-tabs>

          <v-window v-model="tab">
            <v-window-item v-if="container.result">
              <container-update
                :result="container.result"
                :semver="container.image.tag.semver"
                :update-kind="container.updateKind"
                :update-available="container.updateAvailable"
              />
            </v-window-item>
            <v-window-item>
              <container-triggers :container="container" />
            </v-window-item>
            <v-window-item>
              <container-image :image="container.image" />
            </v-window-item>
            <v-window-item>
              <container-detail :container="container" />
            </v-window-item>
            <v-window-item v-if="container.error">
              <container-error :error="container.error" />
            </v-window-item>
          </v-window>

          <v-card-actions>
            <v-row>
              <v-col class="text-center">
                <v-dialog
                  v-model="dialogDelete"
                  width="500"
                  v-if="deleteEnabled"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      small
                      color="error"
                      variant="outlined"
                      v-bind="props"
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
                          <v-btn variant="outlined" @click="dialogDelete = false" small>
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
      </transition>
    </v-card>
  </div>
</template>

<script lang="ts">
import { useDisplay } from "vuetify";
import { getRegistryProviderIcon } from "@/services/registry";
import ContainerDetail from "@/components/ContainerDetail.vue";
import ContainerError from "@/components/ContainerError.vue";
import ContainerImage from "@/components/ContainerImage.vue";
import ContainerTriggers from "@/components/ContainerTriggers.vue";
import ContainerUpdate from "@/components/ContainerUpdate.vue";
import IconRenderer from "@/components/IconRenderer.vue";
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    const { smAndUp, mdAndUp } = useDisplay();
    return { smAndUp, mdAndUp };
  },
  components: {
    ContainerDetail,
    ContainerError,
    ContainerImage,
    ContainerTriggers,
    ContainerUpdate,
    IconRenderer,
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
        newVersion = (this as any).$filters.dateTime(
          this.container.result.created,
        );
      }
      if (this.container.updateKind) {
        newVersion = this.container.updateKind.remoteValue;
      }
      if (this.container.updateKind.kind === "digest") {
        newVersion = (this as any).$filters.short(newVersion, 15);
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

    copyToClipboard(kind: string, value: string) {
      navigator.clipboard.writeText(value);
      (this as any).$eventBus.emit("notify", `${kind} copied to clipboard`);
    },

    collapseDetail() {
      // Prevent collapse when selecting text only
      if (window.getSelection()?.type !== "Range") {
        this.showDetail = !this.showDetail;
      }

      // Hack because of a render bug on tabs inside a collapsible element
      if ((this.$refs.tabs as any) && (this.$refs.tabs as any).onResize) {
        (this.$refs.tabs as any).onResize();
      }
    },

    normalizeFontawesome(iconString: string, prefix: string) {
      return `${prefix} fa-${iconString.replace(`${prefix}:`, "")}`;
    },
  },

  mounted() {
    this.deleteEnabled = (this as any).$serverConfig?.feature?.delete || false;
  },
});
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
