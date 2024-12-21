<template>
  <v-card>
    <v-app-bar flat dense tile @click="collapse()" style="cursor: pointer">
      <v-toolbar-title class="text-body-3">
        <v-chip label color="info" outlined>{{ trigger.type }}</v-chip>
        /
        <v-chip label color="info" outlined>{{ trigger.name }}</v-chip>
      </v-toolbar-title>
      <v-spacer />
      <v-icon>{{ trigger.icon }}</v-icon>
      <v-icon>{{ showDetail ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
    </v-app-bar>
    <v-expand-transition>
      <v-card-text v-show="showDetail">
        <v-row>
          <v-col cols="8">
            <v-list dense v-if="configurationItems.length > 0">
              <v-list-item
                v-for="configurationItem in configurationItems"
                :key="configurationItem.key"
              >
                <v-list-item-content>
                  <v-list-item-title class="text-capitalize">{{
                    configurationItem.key
                  }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ configurationItem.value | formatValue }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
            <span v-else>Default configuration</span>
          </v-col>
          <v-col cols="4" class="text-right">
            <v-btn outlined small class="accent" @click="showTestForm = true">
              Test
              <v-icon right>mdi-test-tube</v-icon>
            </v-btn>

            <v-navigation-drawer
              v-model="showTestForm"
              absolute
              right
              temporary
              width="512"
            >
              <v-container class="text-left">
                <v-card-subtitle class="text-body-1">
                  <v-icon>mdi-test-tube</v-icon>
                  Test trigger</v-card-subtitle
                >
                <v-text-field
                  label="Container ID"
                  v-model="container.id"
                  append-icon="mdi-identifier"
                  outlined
                  dense
                />
                <v-text-field
                  label="Container Name"
                  v-model="container.name"
                  append-icon="mdi-pencil"
                  outlined
                  dense
                />
                <v-text-field
                  label="Container Watcher"
                  v-model="container.watcher"
                  append-icon="mdi-update"
                  outlined
                  dense
                />
                <v-select
                  label="Update kind"
                  v-model="container.updateKind.kind"
                  :items="['digest', 'tag']"
                  :append-icon="
                    container.updateKind.kind === 'tag'
                      ? 'mdi-tag'
                      : 'mdi-pound'
                  "
                  outlined
                  dense
                />
                <v-select
                  v-if="container.updateKind.kind === 'tag'"
                  label="Update semver diff"
                  v-model="container.updateKind.semverDiff"
                  :items="['major', 'minor', 'patch']"
                  :append-icon="
                    container.updateKind.semverDiff === 'major'
                      ? 'mdi-alert'
                      : container.updateKind.semverDiff === 'minor'
                        ? 'mdi-alert-decagram'
                        : 'mdi-information'
                  "
                  outlined
                  dense
                />
                <v-text-field
                  label="Container local value"
                  v-model="container.updateKind.localValue"
                  append-icon="mdi-tag"
                  outlined
                  dense
                />
                <v-text-field
                  label="Container remote value"
                  v-model="container.updateKind.remoteValue"
                  append-icon="mdi-tag-check"
                  outlined
                  dense
                />
                <v-btn
                  outlined
                  small
                  class="accent"
                  block
                  @click="runTrigger"
                  :loading="isTriggering"
                  >Run trigger</v-btn
                >
              </v-container>
            </v-navigation-drawer>
          </v-col>
        </v-row>
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>

<script>
import { runTrigger } from "@/services/trigger";

export default {
  components: {},
  props: {
    trigger: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      showDetail: false,
      showTestForm: false,
      isTriggering: false,
      container: {
        id: "123456789",
        name: "container_test",
        watcher: "watcher_test",
        updateKind: {
          kind: "tag",
          semverDiff: "major",
          localValue: "1.2.3",
          remoteValue: "4.5.6",
          result: {
            link: "https://my-container/release-notes/",
          },
        },
      },
    };
  },
  computed: {
    configurationItems() {
      return Object.keys(this.trigger.configuration || [])
        .map((key) => ({
          key,
          value: this.trigger.configuration[key],
        }))
        .sort((trigger1, trigger2) => trigger1.key.localeCompare(trigger2.key));
    },
  },

  methods: {
    collapse() {
      this.showDetail = !this.showDetail;
    },
    async runTrigger() {
      this.isTriggering = true;
      try {
        await runTrigger({
          triggerType: this.trigger.type,
          triggerName: this.trigger.name,
          container: this.container,
        });
        this.$root.$emit("notify", "Trigger executed with success");
      } catch (err) {
        this.$root.$emit(
          "notify",
          `Trigger executed with error (${err.message}})`,
          "error",
        );
      } finally {
        this.isTriggering = false;
      }
    },
  },
  filters: {
    formatValue(value) {
      return value ? value : "<empty>";
    },
  },
};
</script>
