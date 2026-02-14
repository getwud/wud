<template>
  <v-container fluid class="ma-0 mb-3 pa-md-0">
    <v-row dense>
      <v-col>
        <v-select
          :hide-details="true"
          v-model="watcherSelected"
          :items="watchers"
          @update:modelValue="emitWatcherChanged"
          :clearable="true"
          label="Watcher"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>
      <v-col>
        <v-select
          :hide-details="true"
          v-model="registrySelected"
          :items="registries"
          @update:modelValue="emitRegistryChanged"
          :clearable="true"
          label="Registry"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>
      <v-col>
        <v-select
          :hide-details="true"
          v-model="updateKindSelected"
          :items="updateKinds"
          @update:modelValue="emitUpdateKindChanged"
          :clearable="true"
          label="Update kind"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>

      <v-col>
        <v-autocomplete
          label="Group by label"
          :items="groupLabels"
          v-model="groupByLabelLocal"
          @update:modelValue="emitGroupByLabelChanged"
          clearable
          variant="outlined"
          density="compact"
        >
        </v-autocomplete>
      </v-col>
      <v-col>
        <v-switch
          class="switch-top"
          label="Update available"
          v-model="updateAvailableLocal"
          @update:modelValue="emitUpdateAvailableChanged"
          :hide-details="true"
          density="compact"
        />
      </v-col>
      <v-col>
        <v-switch
          class="switch-top"
          label="Oldest first"
          v-model="oldestFirstLocal"
          @update:modelValue="emitOldestFirstChanged"
          :hide-details="true"
          density="compact"
        />
      </v-col>
      <v-col class="text-right">
        <v-btn
          color="secondary"
          @click.stop="refreshAllContainers"
          :loading="isRefreshing"
        >
          Watch now
          <v-icon> mdi-refresh</v-icon>
        </v-btn>
        <br />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" src="./ContainerFilter.ts"></script>

<style scoped>
.switch-top {
  margin-top: 4px;
}
</style>
