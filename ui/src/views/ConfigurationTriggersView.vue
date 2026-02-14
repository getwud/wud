<template>
  <v-container fluid>
    <v-row v-for="trigger in triggers" :key="trigger.id">
      <v-col :cols="12" class="pt-2 pb-2">
        <trigger-detail :trigger="trigger" />
      </v-col>
    </v-row>
    <v-row v-if="triggers.length === 0">
      <v-card-subtitle class="text-h6">No triggers configured</v-card-subtitle>
    </v-row>
  </v-container>
</template>

<script lang="ts" src="./ConfigurationTriggersView.ts"></script>
