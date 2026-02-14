<template>
  <v-card variant="outlined">
    <v-list-item>
      <template v-slot:prepend>
        <v-icon>mdi-bell-ring</v-icon>
      </template>
      <v-list-item-title class="text-capitalize">
        <router-link to="/configuration/triggers">
          {{ trigger.type }} {{ trigger.name }}
        </router-link>
      </v-list-item-title>
      <v-list-item-subtitle>
        (threshold {{ trigger.configuration.threshold }})
      </v-list-item-subtitle>
      <template v-slot:append>
        <v-btn
          variant="outlined"
          color="accent"
          :disabled="!updateAvailable"
          @click="runTrigger"
          :loading="isTriggering"
        >
          Run
          <v-icon end>mdi-gesture-tap</v-icon>
        </v-btn>
      </template>
    </v-list-item>
  </v-card>
</template>

<script lang="ts" src="./ContainerTrigger.ts"></script>
