<template>
  <div>
    <v-list density="compact">
      <v-list-item>
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-identifier</v-icon>
        </template>
        <v-list-item-title>Id</v-list-item-title>
        <v-list-item-subtitle>
          {{ container.id }}
          <v-tooltip bottom>
            <template v-slot:activator="{ props }">
              <v-btn
                variant="text"
                size="small"
                icon
                v-bind="props"
                @click="copyToClipboard('container id', container.id)"
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
          <v-icon color="secondary">mdi-pencil</v-icon>
        </template>
        <v-list-item-title>Name</v-list-item-title>
        <v-list-item-subtitle>{{ container.name }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="container.stack">
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-layers-outline</v-icon>
        </template>
        <v-list-item-title>Stack</v-list-item-title>
        <v-list-item-subtitle>{{ container.stack }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-restart</v-icon>
        </template>
        <v-list-item-title>Status</v-list-item-title>
        <v-list-item-subtitle>{{ container.status }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-update</v-icon>
        </template>
        <v-list-item-title>Watcher</v-list-item-title>
        <v-list-item-subtitle>
          <router-link to="/configuration/watchers">{{
            container.watcher
          }}</router-link>
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="container.includeTags">
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-tag</v-icon>
        </template>
        <v-list-item-title>
          Include tags
          <v-tooltip bottom>
            <template v-slot:activator="{ props }">
              <v-btn
                x-small
                icon
                v-bind="props"
                href="https://regex101.com"
                target="_blank"
              >
                <v-icon>mdi-regex</v-icon>
              </v-btn>
            </template>
            <span>Test on regex101.com</span>
          </v-tooltip>
        </v-list-item-title>
        <v-list-item-subtitle>{{ container.includeTags }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="container.excludeTags">
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-tag-off</v-icon>
        </template>
        <v-list-item-title>
          Exclude tags
          <v-tooltip bottom>
            <template v-slot:activator="{ props }">
              <v-btn
                x-small
                icon
                v-bind="props"
                href="https://regex101.com"
                target="_blank"
              >
                <v-icon>mdi-regex</v-icon>
              </v-btn>
            </template>
            <span>Test on regex101.com</span>
          </v-tooltip>
        </v-list-item-title>
        <v-list-item-subtitle>{{ container.excludeTags }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="container.transformTags">
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-tag-arrow-right</v-icon>
        </template>
        <v-list-item-title>Transform tags</v-list-item-title>
        <v-list-item-subtitle>{{
          container.transformTags
        }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="container.linkTemplate">
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-file-replace</v-icon>
        </template>
        <v-list-item-title>Link template</v-list-item-title>
        <v-list-item-subtitle>{{
          container.linkTemplate
        }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="container.link">
        <template v-slot:prepend>
          <v-icon color="secondary">mdi-link</v-icon>
        </template>
        <v-list-item-title>Link</v-list-item-title>
        <v-list-item-subtitle
          ><a :href="container.link" target="_blank">{{ container.link }}</a>
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>

    <!-- Settings Discovery & Provenance (WUD Hub) -->
    <v-card variant="outlined" class="mx-3 my-2 pa-3" v-if="container.hub?.enriched">
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="text-subtitle-2 font-weight-bold d-flex align-center">
          <v-icon size="small" class="mr-2 text-primary">mdi-auto-fix</v-icon>
          Découverte Automatique (WUD Hub)
        </div>
        <v-chip size="x-small" color="primary" variant="tonal">Actif</v-chip>
      </div>

      <v-list density="compact" class="py-0">
        <!-- Tag Filter Regex -->
        <v-list-item class="px-0">
          <v-list-item-title class="text-caption text-grey">Filtre de Tags Actif</v-list-item-title>
          <div class="d-flex align-center gap-2 mt-1">
            <code>{{ container.includeTags || '(tous les tags)' }}</code>
            <v-chip size="x-small" :color="container.hub.sources.includeTags === 'label' ? 'warning' : 'primary'" label class="ml-2">
              {{ container.hub.sources.includeTags === 'label' ? 'Surcharge Locale (Label)' : 'WUD Hub' }}
            </v-chip>
          </div>
          <div v-if="container.hub.sources.includeTags === 'label' && container.hub.hubDetails?.originalHubRegex" class="text-caption text-grey mt-1">
            Recommandation Hub ignorée : <code>{{ container.hub.hubDetails.originalHubRegex }}</code>
          </div>
        </v-list-item>

        <!-- Direct Actions (Docs, Changelog, Repo) -->
        <div class="d-flex flex-wrap gap-2 mt-3 pt-2 border-t">
          <v-btn
            v-if="container.hub.hubDetails?.documentationUrl"
            :href="container.hub.hubDetails.documentationUrl"
            target="_blank"
            size="small"
            variant="outlined"
            prepend-icon="mdi-book-open-outline"
            class="mr-2 mb-1"
          >
            Documentation
          </v-btn>
          <v-btn
            v-if="container.hub.hubDetails?.changelogUrl"
            :href="container.hub.hubDetails.changelogUrl"
            target="_blank"
            size="small"
            variant="outlined"
            prepend-icon="mdi-history"
            class="mr-2 mb-1"
          >
            Release Notes
          </v-btn>
          <v-btn
            v-if="container.hub.hubDetails?.upstreamUrl"
            :href="container.hub.hubDetails.upstreamUrl"
            target="_blank"
            size="small"
            variant="outlined"
            prepend-icon="mdi-source-repository"
            class="mr-2 mb-1"
          >
            Source
          </v-btn>
        </div>
      </v-list>
    </v-card>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { copyToClipboard } from "@/services/clipboard";

export default defineComponent({
  props: {
    container: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {};
  },

  methods: {
    async copyToClipboard(kind: string, value: string) {
      const copied = await copyToClipboard(value);
      if (copied) {
        (this as any).$eventBus.emit("notify", `${kind} copied to clipboard`);
      } else {
        (this as any).$eventBus.emit(
          "notify",
          `Unable to copy ${kind} to clipboard`,
          "warning"
        );
      }
    },
  },
});
</script>
