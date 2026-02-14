<template>
  <v-card>
    <v-card-title
      @click="collapse()"
      style="cursor: pointer"
      class="pa-3 d-flex align-center bg-surface"
    >
      <div class="text-body-3">
        <v-chip label color="info" variant="outlined">{{ trigger.type }}</v-chip>
        /
        <v-chip label color="info" variant="outlined">{{ trigger.name }}</v-chip>
      </div>
      <v-spacer />
      <v-icon>{{ trigger.icon }}</v-icon>
      <v-icon>{{ showDetail ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
    </v-card-title>
    <transition name="expand-transition">
      <v-card-text v-show="showDetail">
        <v-row>
          <v-col cols="8">
            <v-list density="compact" v-if="configurationItems.length > 0">
              <v-list-item
                v-for="configurationItem in configurationItems"
                :key="configurationItem.key"
              >
                <v-list-item-title class="text-capitalize">{{
                  configurationItem.key
                }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatValue(configurationItem.value) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <span v-else>Default configuration</span>
          </v-col>
          <v-col cols="4" class="text-right">
            <v-btn variant="outlined" size="small" color="accent" @click="showTestForm = true">
              Test
              <v-icon right>mdi-test-tube</v-icon>
            </v-btn>

            <v-navigation-drawer
              v-model="showTestForm"
              location="right"
              temporary
              width="400"
              style="position: absolute;"
            >
              <div class="pa-3">
                <div class="text-subtitle-2 mb-2">
                  <v-icon size="small">mdi-test-tube</v-icon>
                  Test trigger
                </div>
                <v-text-field
                  label="Container ID"
                  v-model="container.id"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-2"
                />
                <v-text-field
                  label="Container Name"
                  v-model="container.name"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-2"
                />
                <v-text-field
                  label="Container Watcher"
                  v-model="container.watcher"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-2"
                />
                <v-select
                  label="Update kind"
                  v-model="container.updateKind.kind"
                  :items="['digest', 'tag']"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-2"
                />
                <v-select
                  v-if="container.updateKind.kind === 'tag'"
                  label="Update semver diff"
                  v-model="container.updateKind.semverDiff"
                  :items="['major', 'minor', 'patch']"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-2"
                />
                <v-text-field
                  label="Container local value"
                  v-model="container.updateKind.localValue"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-2"
                />
                <v-text-field
                  label="Container remote value"
                  v-model="container.updateKind.remoteValue"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-3"
                />
                <v-btn
                  variant="outlined"
                  size="small"
                  color="accent"
                  block
                  @click="runTrigger"
                  :loading="isTriggering"
                  >Run trigger</v-btn
                >
              </div>
            </v-navigation-drawer>
          </v-col>
        </v-row>
      </v-card-text>
    </transition>
  </v-card>
</template>

<script lang="ts" src="./TriggerDetail.ts"></script>
