<template>
  <v-container fluid>
    <v-row>
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="serverConfiguration" />
      </v-col>
    </v-row>
    <v-row>
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="logConfiguration" />
      </v-col>
    </v-row>
    <v-row>
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="storeConfiguration" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" src="./ConfigurationServerView.ts"></script>
