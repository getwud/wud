<template>
  <v-form @keyup.enter="redirect">
    <v-card-text>
      <v-btn block color="primary" @click="redirect">
        <v-icon color="warning">mdi-openid</v-icon>
        &nbsp;Connect
      </v-btn>
    </v-card-text>
  </v-form>
</template>

<script lang="ts" src="./LoginOidc.ts"></script>
