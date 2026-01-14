<template>
  <v-card>
    <v-card-title
      @click="collapse()"
      style="cursor: pointer"
      class="pa-3 d-flex align-center bg-surface"
    >
      <div class="text-body-3">
        <v-chip label color="info" variant="outlined">{{ item.type }}</v-chip>
        /
        <v-chip label color="info" variant="outlined">{{ item.name }}</v-chip>
      </div>
      <v-spacer />
      <IconRenderer :icon="item.icon" :size="24" :margin-right="8" />
      <v-icon>{{ showDetail ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
    </v-card-title>
    <transition name="expand-transition">
      <v-card-text v-show="showDetail">
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
      </v-card-text>
    </transition>
  </v-card>
</template>

<script lang="ts" src="./ConfigurationItem.ts"></script>
