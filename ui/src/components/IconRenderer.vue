<template>
  <img
    v-if="isHomarrIcon"
    :src="homarrIconUrl"
    :style="iconStyle"
    :alt="icon"
  />
  <img
    v-else-if="isSelfhstIcon"
    :src="selfhstIconUrl"
    :style="iconStyle"
    :alt="icon"
  />
  <img
    v-else-if="isSimpleIcon"
    :src="simpleIconUrl"
    :style="iconStyle"
    :alt="icon"
    class="simple-icon"
  />
  <v-icon v-else :style="iconStyle">
    {{ normalizedIcon }}
  </v-icon>
</template>

<script lang="ts" src="./IconRenderer.ts"></script>

<style scoped>
.simple-icon {
  filter: brightness(0) saturate(100%) opacity(0.87);
}

.v-theme--dark .simple-icon {
  filter: brightness(0) saturate(100%) invert(1) opacity(0.87);
}
</style>