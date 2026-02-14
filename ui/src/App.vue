<template>
  <v-app class="main-background">
    <snack-bar
      :message="snackbarMessage"
      :show="snackbarShow"
      :level="snackbarLevel"
    />

    <navigation-drawer v-if="authenticated" />

    <app-bar v-if="authenticated" :user="user" />

    <!-- Sizes your content based upon application components -->
    <v-main>
      <v-row>
        <v-col>
          <router-view></router-view>
        </v-col>
      </v-row>
    </v-main>

    <app-footer v-if="authenticated" />
  </v-app>
</template>

<script lang="ts" src="./App.ts"></script>

<style scoped>
.main-background {
  /* background-color: #f5f5f5; */
}
</style>
