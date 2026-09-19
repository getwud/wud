<template>
  <v-card v-if="isVisible" class="live-watch-hud" elevation="8">
    <v-card-title class="d-flex justify-space-between align-center pa-2 pb-0">
      <span class="text-subtitle-2 font-weight-bold">
        <v-icon size="small" color="primary" class="mr-1">mdi-eye</v-icon>
        Live Watch
      </span>
      <v-btn icon="mdi-close" size="x-small" variant="text" @click="closeHud"></v-btn>
    </v-card-title>
    
    <v-card-text class="pa-3">
      <div class="d-flex justify-space-between text-caption mb-1">
        <span>Progress</span>
        <span>{{ totalProcessed }} / {{ totalCount }}</span>
      </div>
      <v-progress-linear :model-value="progressPercent" color="primary" height="8" rounded></v-progress-linear>
      
      <div v-if="currentContainer" class="text-caption mt-2 text-truncate">
        Inspecting: <strong>{{ currentContainer.name }}</strong> ({{ currentWatcher }})
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { eventService } from '../services/event';

const isVisible = ref(false);
const watchers = ref<Record<string, { processed: number; total: number; active: boolean }>>({});
const currentContainer = ref<any>(null);
const currentWatcher = ref<string>('');

const totalCount = computed(() => Object.values(watchers.value).reduce((sum, w) => sum + w.total, 0));
const totalProcessed = computed(() => Object.values(watchers.value).reduce((sum, w) => sum + w.processed, 0));
const allFinished = computed(() => Object.values(watchers.value).every(w => !w.active));

const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.round((totalProcessed.value / totalCount.value) * 100);
});

const onWatchStart = (data: any) => {
  isVisible.value = true;
  if (data.watcher) {
    watchers.value[data.watcher] = {
      processed: 0,
      total: data.total || 0,
      active: true,
    };
  }
};

const onWatchProgress = (data: any) => {
  if (data.watcher && watchers.value[data.watcher]) {
    watchers.value[data.watcher].processed = data.processed;
    watchers.value[data.watcher].total = data.total;
  } else if (data.watcher) {
    watchers.value[data.watcher] = {
      processed: data.processed,
      total: data.total,
      active: true,
    };
  }
  currentContainer.value = data.container;
  currentWatcher.value = data.watcher;
};

const onWatchStop = (data: any) => {
  if (data.watcher && watchers.value[data.watcher]) {
    watchers.value[data.watcher].processed = data.processed;
    watchers.value[data.watcher].total = data.total;
    watchers.value[data.watcher].active = false;
  }
  
  if (allFinished.value) {
    setTimeout(() => {
      if (allFinished.value) {
        isVisible.value = false;
      }
    }, 3000);
  }
};

onMounted(() => {
  eventService.on('wud:watch-start', onWatchStart);
  eventService.on('wud:watch-progress', onWatchProgress);
  eventService.on('wud:watch-stop', onWatchStop);
});

onUnmounted(() => {
  eventService.off('wud:watch-start', onWatchStart);
  eventService.off('wud:watch-progress', onWatchProgress);
  eventService.off('wud:watch-stop', onWatchStop);
});

function closeHud() {
  isVisible.value = false;
}
</script>

<style scoped>
.live-watch-hud {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 280px;
  z-index: 100;
  border-radius: 8px;
}
</style>
