<template>
  <v-container fluid>
    <v-row v-for="registry in registries" :key="registry.id">
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="registry" />
      </v-col>
    </v-row>
    <v-row v-if="registries.length === 0">
      <v-card-subtitle class="text-h6"
        >No registries configured</v-card-subtitle
      >
    </v-row>
  </v-container>
</template>

<script lang="ts" src="./ConfigurationRegistriesView.ts"></script>
