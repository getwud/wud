<template>
  <v-container fluid>
    <v-row dense>
      <v-col>
        <container-filter
          :registries="registries"
          :registry-selected-init="registrySelected"
          :watchers="watchers"
          :watcher-selected-init="watcherSelected"
          :update-kinds="updateKinds"
          :update-kind-selected-init="updateKindSelected"
          :updateAvailable="updateAvailableSelected"
          :oldestFirst="oldestFirst"
          :groupByLabel="groupByLabel"
          :groupLabels="allContainerLabels"
          @registry-changed="onRegistryChanged"
          @watcher-changed="onWatcherChanged"
          @update-available-changed="onUpdateAvailableChanged"
          @oldest-first-changed="onOldestFirstChanged"
          @group-by-label-changed="onGroupByLabelChanged"
          @update-kind-changed="onUpdateKindChanged"
          @refresh-all-containers="onRefreshAllContainers"
        />
      </v-col>
    </v-row>
<v-row
        v-for="(container, index) in containersFiltered"
        :key="container.id"
      >
        <v-col class="pt-2 pb-2">
          <container-item
            :groupingLabel="groupByLabel"
            :previousContainer="containersFiltered[index - 1]"
            :container="container"
            :oldest-first="oldestFirst"
            @delete-container="deleteContainer(container)"
            @container-deleted="removeContainerFromList(container)"
          />
        </v-col>
      </v-row>
    <v-row v-if="containersFiltered.length === 0">
      <v-card-subtitle class="text-h6">No containers found</v-card-subtitle>
    </v-row>
  </v-container>
</template>

<script lang="ts" src="./ContainersView.ts"></script>
