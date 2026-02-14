<template>
  <v-container class="login-background">
    <v-dialog v-model="showDialog" width="400px" persistent no-click-animation>
      <v-card>
        <v-container>
          <v-row justify="center" class="ma-1">
            <v-avatar color="primary" size="80">
              <v-icon color="white" size="x-large">mdi-account</v-icon>
            </v-avatar>
          </v-row>
          <v-row>
            <v-container>
              <v-tabs v-model="strategySelected">
                <v-tab
                  v-for="strategy in strategies"
                  :key="strategy.name"
                  class="text-body-2"
                >
                  {{ strategy.name }}
                </v-tab>
              </v-tabs>
              <v-window v-model="strategySelected">
                <v-window-item
                  v-for="strategy in strategies"
                  :key="strategy.type + strategy.name"
                >
                  <login-basic
                    v-if="strategy.type === 'basic'"
                    @authentication-success="onAuthenticationSuccess"
                  />
                  <login-oidc
                    v-if="strategy.type === 'oidc'"
                    :name="strategy.name"
                    @authentication-success="onAuthenticationSuccess"
                  />
                </v-window-item>
              </v-window>
            </v-container>
          </v-row>
        </v-container>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" src="./LoginView.ts"></script>
