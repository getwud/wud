<template>
  <div>
    <v-list density="compact" v-if="updateAvailable">
      <v-list-item v-if="result.tag">
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-tag</v-icon>
        </template>
        <v-list-item-title>
          Tag
          <v-chip v-if="semver" size="x-small" variant="outlined" color="success" label
            >semver</v-chip
          >
        </v-list-item-title>
        <v-list-item-subtitle>
          {{ result.tag }}
          <v-tooltip bottom>
            <template v-slot:activator="{ props }">
              <v-btn
                variant="text"
                size="small"
                icon
                v-bind="props"
                @click="copyToClipboard('update tag', result.tag)"
              >
                <v-icon size="small">mdi-clipboard</v-icon>
              </v-btn>
            </template>
            <span class="text-caption">Copy to clipboard</span>
          </v-tooltip>
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="result.link">
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-link</v-icon>
        </template>
        <v-list-item-title>Link</v-list-item-title>
        <v-list-item-subtitle
          ><a :href="result.link" target="_blank">{{ result.link }}</a>
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="result.digest">
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-function-variant</v-icon>
        </template>
        <v-list-item-title> Digest </v-list-item-title>
        <v-list-item-subtitle>
          {{ result.digest }}
          <v-tooltip bottom>
            <template v-slot:activator="{ props }">
              <v-btn
                variant="text"
                size="small"
                icon
                v-bind="props"
                @click="copyToClipboard('update digest', result.digest)"
              >
                <v-icon size="small">mdi-clipboard</v-icon>
              </v-btn>
            </template>
            <span class="text-caption">Copy to clipboard</span>
          </v-tooltip>
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <template v-slot:prepend>
          <v-icon v-if="updateKind.semverDiff === 'patch'" color="success"
            >mdi-information</v-icon
          >
          <v-icon v-else-if="updateKind.semverDiff === 'major'" color="error"
            >mdi-alert-decagram</v-icon
          >
          <v-icon v-else color="warning">mdi-alert</v-icon>
        </template>
        <v-list-item-title>Update kind</v-list-item-title>
        <v-list-item-subtitle>
          {{ updateKindFormatted }}
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>
    <v-card-text v-else>No update available</v-card-text>
  </div>
</template>

<script lang="ts" src="./ContainerUpdate.ts"></script>
