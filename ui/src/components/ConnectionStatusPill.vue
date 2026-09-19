<template>
  <div class="connection-status" @click="handleClick">
    <div
      class="status-indicator"
      :class="{
        'is-connected': state === 'connected',
        'is-reconnecting': state === 'reconnecting',
        'is-offline': state === 'offline'
      }"
    ></div>
    <span v-if="state === 'offline'" class="status-text text-caption ml-2">Reconnect</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { eventService } from '../services/event';

const state = computed(() => eventService.connectionState.value);

function handleClick() {
  if (state.value === 'offline') {
    eventService.reconnect();
  }
}
</script>

<style scoped>
.connection-status {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 12px;
  transition: background-color 0.2s;
}

.connection-status:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.is-connected {
  background-color: #4caf50;
  box-shadow: 0 0 8px #4caf50;
  animation: pulse 2s infinite;
}

.is-reconnecting {
  background-color: #ffeb3b;
  box-shadow: 0 0 8px #ffeb3b;
  animation: spin 1s infinite linear;
}

.is-offline {
  background-color: #f44336;
  box-shadow: 0 0 8px #f44336;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}
</style>
