<template>
  <v-container>
    <v-row class="d-md-flex pa-md-15 ma-md-15">
      <v-col xs="12" sm="12" md="6" lg="3" xl="3">
        <v-card class="home-card text-center" variant="outlined">
          <v-icon color="secondary" class="home-icon">{{
            containerIcon
          }}</v-icon>
          <br />
          <v-btn variant="plain" size="x-large" to="/containers"
            >{{ containersCount }} containers</v-btn
          >
          <br />
          <v-btn
            size="small"
            variant="plain"
            :color="containersToUpdateCount > 0 ? 'warning' : 'success'"
            to="/containers?update-available=true"
            :style="{
              pointerEvents: containersToUpdateCount === 0 ? 'none' : 'auto',
            }"
            >({{ containerUpdateMessage }})</v-btn
          >
        </v-card>
      </v-col>
      <v-col xs="12" sm="12" md="6" lg="3" xl="3">
        <v-card class="home-card text-center" variant="outlined">
          <v-icon color="secondary" class="home-icon">{{ triggerIcon }}</v-icon>
          <br />
          <v-btn variant="plain" size="x-large" to="/configuration/triggers"
            >{{ triggersCount }} triggers</v-btn
          >
          <br />
        </v-card>
      </v-col>
      <v-col xs="12" sm="12" md="6" lg="3" xl="3">
        <v-card class="home-card text-center" variant="outlined">
          <v-icon color="secondary" class="home-icon">{{ watcherIcon }}</v-icon>
          <br />
          <v-btn variant="plain" size="x-large" to="/configuration/watchers"
            >{{ watchersCount }} watchers</v-btn
          >
        </v-card>
      </v-col>
      <v-col xs="12" sm="12" md="6" lg="3" xl="3">
        <v-card class="home-card text-center" variant="outlined">
          <v-icon color="secondary" class="home-icon">{{
            registryIcon
          }}</v-icon>
          <br />
          <v-btn variant="plain" size="x-large" to="/configuration/registries"
            >{{ registriesCount }} registries</v-btn
          >
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" src="./HomeView.ts"></script>
<style scoped>
.home-card {
  height: 160px;
}

.home-icon {
  font-size: 80px;
}
</style>
