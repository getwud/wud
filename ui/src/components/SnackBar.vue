<template>
  <v-snackbar
    v-model="showLocal"
    :timeout="timeout"
    color="primary"
    variant="outlined"
  >
    {{ message }}
    <template v-slot:actions>
      <v-btn variant="text" @click="closeSnackbar">Close</v-btn>
    </template>
  </v-snackbar>
</template>

<script lang="ts" src="./SnackBar.ts"></script>
