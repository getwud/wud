<template>
  <v-container fluid>
    <v-row v-for="watcher in authentications" :key="watcher.id">
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="watcher" />
      </v-col>
    </v-row>
    <v-row v-if="authentications.length === 0">
      <v-card-subtitle class="text-h6"
        >No authentication configured</v-card-subtitle
      >
    </v-row>
  </v-container>
</template>

<script lang="ts" src="./ConfigurationAuthenticationsView.ts"></script>
