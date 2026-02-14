<template>
  <v-footer app padless dark height="30px">
    <v-col cols="12" class="text-center text-caption pa-0">
      {{ new Date().getFullYear() }} — WUD (version {{ version }})
    </v-col>
  </v-footer>
</template>

<script lang="ts" src="./AppFooter.ts"></script>
