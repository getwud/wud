<template>
  <div class="upgrade-timeline">
    <div v-if="!releases || releases.length === 0" class="text-body-2 text-medium-emphasis py-4 text-center">
      No intermediate release details available.
    </div>

    <v-timeline
      v-else
      align="start"
      density="compact"
      side="end"
      class="pa-0"
    >
      <v-timeline-item
        v-for="(release, index) in releases"
        :key="release.tag || index"
        :dot-color="getDotColor(release)"
        :icon="getDotIcon(release)"
        size="small"
        fill-dot
      >
        <template #opposite v-if="release.publishedAt">
          <span class="text-caption text-medium-emphasis">
            {{ formatDate(release.publishedAt) }}
          </span>
        </template>

        <div class="timeline-content mb-3">
          <div class="d-flex align-center flex-wrap ga-2">
            <span class="text-subtitle-2 font-weight-bold font-mono">
              {{ release.tag }}
            </span>
            <span v-if="release.name && release.name !== release.tag" class="text-body-2 text-medium-emphasis">
              — {{ release.name }}
            </span>
            <v-chip
              v-if="release.isTarget"
              size="x-small"
              color="primary"
              variant="flat"
              label
            >
              Target Version
            </v-chip>
            <v-chip
              v-if="release.breakingChanges && release.breakingChanges.length > 0"
              size="x-small"
              color="error"
              variant="tonal"
              label
            >
              {{ release.breakingChanges.length }} breaking
            </v-chip>
            <v-btn
              v-if="release.url"
              :href="release.url"
              target="_blank"
              variant="text"
              density="compact"
              icon="mdi-open-in-new"
              size="x-small"
              color="secondary"
              class="ml-auto"
              :aria-label="`Release notes for ${release.tag}`"
            />
          </div>

          <div v-if="release.summary" class="text-body-2 text-medium-emphasis mt-1">
            {{ release.summary }}
          </div>

          <div
            v-if="release.breakingChanges && release.breakingChanges.length > 0"
            class="breaking-box mt-2 pa-2 rounded"
          >
            <div class="text-caption font-weight-bold text-error d-flex align-center mb-1">
              <v-icon size="x-small" color="error" class="mr-1">mdi-alert-octagon</v-icon>
              Breaking Changes:
            </div>
            <ul class="text-caption pl-4 mb-0 text-error-darken-1">
              <li v-for="(change, cIdx) in release.breakingChanges" :key="cIdx">
                {{ change }}
              </li>
            </ul>
          </div>
        </div>
      </v-timeline-item>
    </v-timeline>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { IntermediateReleaseItem } from "@/services/hub";

export default defineComponent({
  name: "UpgradeTimeline",
  props: {
    releases: {
      type: Array as PropType<IntermediateReleaseItem[]>,
      default: () => [],
    },
    currentTag: {
      type: String,
      default: "",
    },
    targetTag: {
      type: String,
      default: "",
    },
  },
  setup() {
    function getDotColor(release: IntermediateReleaseItem): string {
      if (release.isTarget) return "primary";
      if (release.breakingChanges && release.breakingChanges.length > 0) return "error";
      return "info";
    }

    function getDotIcon(release: IntermediateReleaseItem): string {
      if (release.isTarget) return "mdi-flag-checkered";
      if (release.breakingChanges && release.breakingChanges.length > 0) {
        return "mdi-alert-octagon";
      }
      return "mdi-tag-outline";
    }

    function formatDate(dateStr?: string): string {
      if (!dateStr) return "";
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        return dateStr;
      }
    }

    return {
      getDotColor,
      getDotIcon,
      formatDate,
    };
  },
});
</script>

<style scoped>
.upgrade-timeline {
  width: 100%;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.breaking-box {
  background-color: rgba(244, 67, 54, 0.08);
  border-left: 3px solid rgb(244, 67, 54);
}
</style>
