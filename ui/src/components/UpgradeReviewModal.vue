<template>
  <v-dialog
    :model-value="modelValue"
    max-width="850"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg upgrade-review-modal">
      <v-toolbar color="surface" density="compact" class="px-3 border-b">
        <v-icon color="primary" class="mr-2">mdi-shield-search</v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Upgrade Review — {{ containerName }}
        </v-toolbar-title>
        <v-spacer />
        <RiskPill
          v-if="analysis || isUnpaired"
          :risk-score="analysis?.riskScore"
          :skipped-versions-count="analysis?.skippedVersionsCount"
          :is-unpaired="isUnpaired"
          size="small"
          class="mr-2"
        />
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="close"
          aria-label="Close"
        />
      </v-toolbar>

      <!-- Version Transition Sub-header -->
      <div class="px-4 py-3 bg-surface-variant d-flex align-center justify-space-between flex-wrap ga-2 border-b">
        <div class="d-flex align-center flex-wrap ga-2">
          <span class="text-caption text-medium-emphasis">Image:</span>
          <code class="font-weight-medium">{{ containerImage }}</code>
        </div>
        <div class="d-flex align-center ga-2">
          <v-chip label size="small" variant="outlined" color="secondary">
            {{ currentTag || 'current' }}
          </v-chip>
          <v-icon size="small" color="primary">mdi-arrow-right</v-icon>
          <v-chip label size="small" variant="flat" color="primary">
            {{ targetTag || 'target' }}
          </v-chip>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <v-tabs v-model="activeTab" density="compact" color="primary" class="border-b px-2">
        <v-tab value="summary" prepend-icon="mdi-shield-check">
          Pre-Flight Summary
        </v-tab>
        <v-tab value="journey" prepend-icon="mdi-timeline-text">
          Upgrade Journey
          <v-badge
            v-if="intermediateReleases.length > 0"
            :content="intermediateReleases.length"
            inline
            color="secondary"
            class="ml-1"
          />
        </v-tab>
        <v-tab value="checklist" prepend-icon="mdi-checkbox-marked-circle-outline">
          Safety Checklist
        </v-tab>
      </v-tabs>

      <!-- Modal Content Body -->
      <v-card-text class="pa-4" style="max-height: 540px;">
        <!-- TAB 1: PRE-FLIGHT SUMMARY -->
        <div v-if="activeTab === 'summary'">
          <!-- Freemium / Gated Banner -->
          <v-alert
            v-if="isGated"
            type="info"
            variant="tonal"
            density="compact"
            icon="mdi-lock-outline"
            class="mb-3"
          >
            <div class="font-weight-medium text-body-2">Multi-Version Journey Locked</div>
            <div class="text-caption mb-2">
              Deep cumulative changelog analysis across multiple skipped versions is a WUD Hub feature.
            </div>
            <v-btn
              v-if="analysis?.trialActivationUrl"
              :href="analysis.trialActivationUrl"
              target="_blank"
              size="x-small"
              color="primary"
              variant="flat"
            >
              Start 14-Day Free Trial
            </v-btn>
            <v-btn
              v-else
              to="/hub"
              size="x-small"
              color="primary"
              variant="flat"
            >
              View Hub Plans
            </v-btn>
          </v-alert>

          <!-- Multi-version jump banner -->
          <v-alert
            v-if="analysis?.skippedVersionsCount && analysis.skippedVersionsCount > 0"
            color="secondary"
            variant="tonal"
            density="compact"
            icon="mdi-transit-connection-variant"
            class="mb-3"
          >
            <div class="font-weight-medium text-body-2">
              Multi-Version Jump: Skipping {{ analysis.skippedVersionsCount }} {{ analysis.skippedVersionsCount === 1 ? 'version' : 'versions' }}
            </div>
            <div class="text-caption">
              This upgrade crosses multiple intermediate releases. Cumulative changes and potential migration risks are highlighted below.
            </div>
          </v-alert>

          <!-- Executive Summary -->
          <div v-if="analysis?.summary" class="mb-4">
            <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
              EXECUTIVE SUMMARY
            </div>
            <p class="text-body-2 mb-0">{{ analysis.summary }}</p>
          </div>

          <!-- Database Impact Warning -->
          <v-alert
            v-if="analysis?.databaseImpact"
            type="warning"
            variant="tonal"
            density="compact"
            icon="mdi-database-alert"
            class="mb-4"
          >
            <div class="font-weight-medium text-body-2">Database & Storage Impact</div>
            <div class="text-caption">{{ analysis.databaseImpact }}</div>
          </v-alert>

          <!-- Cumulative Breaking Changes -->
          <div class="mb-4">
            <div class="text-caption font-weight-bold text-error mb-2 d-flex align-center">
              <v-icon size="small" color="error" class="mr-1">mdi-alert-octagon</v-icon>
              CUMULATIVE BREAKING CHANGES ({{ breakingChanges.length }})
            </div>

            <div v-if="breakingChanges.length === 0" class="text-body-2 text-medium-emphasis">
              No breaking changes detected for this upgrade path.
            </div>

            <v-list v-else density="compact" class="bg-surface-light rounded pa-2">
              <v-list-item
                v-for="(bc, idx) in breakingChanges"
                :key="idx"
                class="pa-1 min-height-0"
              >
                <div class="text-body-2 text-error-darken-1 d-flex align-start">
                  <v-icon size="x-small" color="error" class="mr-2 mt-1">mdi-alert-circle</v-icon>
                  <span>{{ bc }}</span>
                </div>
              </v-list-item>
            </v-list>
          </div>

          <!-- Environment Variables Changes -->
          <div class="mb-3">
            <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
              ENVIRONMENT VARIABLE CHANGES ({{ envVarChanges.length }})
            </div>

            <div v-if="envVarChanges.length === 0" class="text-body-2 text-medium-emphasis">
              No environment variable modifications required.
            </div>

            <div v-else class="rounded border overflow-hidden">
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Change</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(env, idx) in envVarChanges" :key="idx">
                    <td class="font-weight-bold text-body-2 font-mono">
                      {{ env.name }}
                    </td>
                    <td>
                      <v-chip
                        :color="getEnvVarChipColor(env.changeType || (env as any).type)"
                        size="x-small"
                        label
                        variant="flat"
                      >
                        {{ env.changeType || (env as any).type }}
                      </v-chip>
                    </td>
                    <td class="text-caption">
                      {{ env.description }}
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>
        </div>

        <!-- TAB 2: UPGRADE JOURNEY -->
        <div v-else-if="activeTab === 'journey'">
          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-caption font-weight-bold text-medium-emphasis">
              INTERMEDIATE RELEASE TIMELINE
            </span>
            <span class="text-caption text-medium-emphasis font-mono">
              {{ currentTag }} → {{ targetTag }}
            </span>
          </div>

          <UpgradeTimeline
            :releases="intermediateReleases"
            :current-tag="currentTag"
            :target-tag="targetTag"
          />
        </div>

        <!-- TAB 3: SAFETY CHECKLIST -->
        <div v-else-if="activeTab === 'checklist'">
          <div class="mb-3">
            <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
              PRE-FLIGHT VERIFICATIONS
            </div>
            <div class="text-caption text-medium-emphasis">
              Recommended verifications before proceeding with the update:
            </div>
          </div>

          <v-list class="bg-surface-light rounded pa-2">
            <v-list-item
              v-for="(item, idx) in checklistItems"
              :key="idx"
              class="px-2 py-1"
            >
              <template #prepend>
                <v-icon color="success" size="small" class="mr-3">
                  mdi-check-circle-outline
                </v-icon>
              </template>
              <v-list-item-title class="font-weight-medium text-body-2">
                {{ item.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption text-medium-emphasis">
                {{ item.description }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="px-4 py-3 bg-surface d-flex align-center justify-space-between flex-wrap ga-2">
        <v-btn
          variant="outlined"
          size="small"
          color="secondary"
          prepend-icon="mdi-file-download-outline"
          @click="exportMarkdown"
        >
          Export Markdown
        </v-btn>

        <div class="d-flex align-center ga-2">
          <v-btn
            variant="text"
            size="small"
            @click="close"
          >
            Close
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-package-down"
            @click="onUpdateNow"
          >
            Update Container
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, computed, ref, PropType } from "vue";
import RiskPill from "./RiskPill.vue";
import UpgradeTimeline from "./UpgradeTimeline.vue";
import { RiskAnalysisResult, IntermediateReleaseItem, EnvVarChange } from "@/services/hub";
import { copyToClipboard } from "@/services/clipboard";
import { useEventBus } from "@/composables/useEventBus";

export default defineComponent({
  name: "UpgradeReviewModal",
  components: {
    RiskPill,
    UpgradeTimeline,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    container: {
      type: Object,
      required: true,
    },
    riskAnalysis: {
      type: Object as PropType<RiskAnalysisResult | null | undefined>,
      default: undefined,
    },
    isUnpaired: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue", "update-now"],
  setup(props, { emit }) {
    const activeTab = ref<"summary" | "journey" | "checklist">("summary");
    const eventBus = useEventBus();

    const analysis = computed<RiskAnalysisResult | undefined>(() => {
      return props.riskAnalysis || props.container?.result?.riskAnalysis;
    });

    const containerName = computed(() => props.container?.name || "Container");
    const containerImage = computed(() => {
      const img = props.container?.image;
      if (!img) return "";
      return typeof img.name === "string" ? img.name : "";
    });

    const currentTag = computed(() => {
      const imgTag = props.container?.image?.tag;
      if (imgTag && typeof imgTag === "object" && "value" in imgTag) {
        return String((imgTag as any).value || "");
      }
      if (typeof imgTag === "string") {
        return imgTag;
      }
      return analysis.value?.currentTag || "";
    });

    const targetTag = computed(() => {
      const resTag = props.container?.result?.tag;
      if (resTag && typeof resTag === "object" && "value" in resTag) {
        return String((resTag as any).value || "");
      }
      if (typeof resTag === "string") {
        return resTag;
      }
      if (analysis.value?.targetTag) {
        return String(analysis.value.targetTag);
      }
      const resVer = props.container?.result?.version;
      if (typeof resVer === "string") {
        return resVer;
      }
      return "";
    });

    const isGated = computed(() => {
      return (
        analysis.value?.freemiumGated === true ||
        analysis.value?.riskScore === "locked"
      );
    });

    const breakingChanges = computed<string[]>(() => {
      return analysis.value?.breakingChanges || [];
    });

    const envVarChanges = computed<EnvVarChange[]>(() => {
      return analysis.value?.envVarChanges || [];
    });

    const intermediateReleases = computed<IntermediateReleaseItem[]>(() => {
      return analysis.value?.intermediateReleases || [];
    });

    const checklistItems = [
      {
        title: "Backup Database & Persistent Data",
        description: "Perform snapshot/backup of container volumes or databases before proceeding.",
      },
      {
        title: "Verify Breaking Changes & Deprecations",
        description: "Confirm that application configs and APIs are compatible with breaking changes.",
      },
      {
        title: "Review Environment Variables",
        description: "Ensure newly added or modified environment variables are updated in docker-compose or env files.",
      },
      {
        title: "Prepare Rollback Procedure",
        description: "Ensure container rollback command or image pin is ready in case of unexpected startup failure.",
      },
    ];

    function getEnvVarChipColor(type: string): string {
      switch (type) {
        case "removed":
        case "required":
          return "error";
        case "modified":
        case "deprecated":
          return "warning";
        case "added":
          return "success";
        default:
          return "secondary";
      }
    }

    function close() {
      emit("update:modelValue", false);
    }

    function onUpdateNow() {
      emit("update-now", props.container);
      close();
    }

    async function exportMarkdown() {
      const lines: string[] = [
        `# Upgrade Review Report: ${containerName.value}`,
        ``,
        `- **Image**: ${containerImage.value}`,
        `- **Current Tag**: ${currentTag.value}`,
        `- **Target Tag**: ${targetTag.value}`,
        `- **Risk Score**: ${analysis.value?.riskScore || "unknown"}`,
        `- **Skipped Versions**: ${analysis.value?.skippedVersionsCount ?? intermediateReleases.value.length}`,
        `- **Generated At**: ${new Date().toISOString()}`,
        ``,
        `## Executive Summary`,
        analysis.value?.summary || "No executive summary available.",
        ``,
      ];

      if (analysis.value?.databaseImpact) {
        lines.push(`## Database Impact`);
        lines.push(`⚠️ ${analysis.value.databaseImpact}`);
        lines.push(``);
      }

      lines.push(`## Breaking Changes (${breakingChanges.value.length})`);
      if (breakingChanges.value.length === 0) {
        lines.push(`None identified.`);
      } else {
        breakingChanges.value.forEach((bc) => lines.push(`- ${bc}`));
      }
      lines.push(``);

      lines.push(`## Environment Variable Changes (${envVarChanges.value.length})`);
      if (envVarChanges.value.length === 0) {
        lines.push(`None identified.`);
      } else {
        envVarChanges.value.forEach((env) =>
          lines.push(`- \`${env.name}\` [${env.changeType || (env as any).type}]: ${env.description}`)
        );
      }
      lines.push(``);

      if (intermediateReleases.value.length > 0) {
        lines.push(`## Upgrade Journey Releases`);
        intermediateReleases.value.forEach((rel) => {
          lines.push(`### ${rel.tag}${rel.isTarget ? " (Target)" : ""}`);
          if (rel.publishedAt) lines.push(`- Published: ${rel.publishedAt}`);
          if (rel.summary) lines.push(`- Summary: ${rel.summary}`);
          if (rel.breakingChanges && rel.breakingChanges.length > 0) {
            lines.push(`- Breaking: ${rel.breakingChanges.join(", ")}`);
          }
          if (rel.url) lines.push(`- Link: ${rel.url}`);
        });
        lines.push(``);
      }

      lines.push(`## Pre-Flight Readiness Checklist`);
      checklistItems.forEach((item) => {
        lines.push(`- ${item.title}: ${item.description}`);
      });

      const mdContent = lines.join("\n");
      const copied = await copyToClipboard(mdContent);
      if (copied) {
        eventBus.emit("notify", "Upgrade review markdown copied to clipboard");
      } else {
        eventBus.emit("notify", "Unable to copy markdown report", "warning");
      }
    }

    return {
      activeTab,
      analysis,
      containerName,
      containerImage,
      currentTag,
      targetTag,
      isGated,
      breakingChanges,
      envVarChanges,
      intermediateReleases,
      checklistItems,
      getEnvVarChipColor,
      close,
      onUpdateNow,
      exportMarkdown,
    };
  },
});
</script>

<style scoped>
.upgrade-review-modal {
  border-radius: 8px;
  overflow: hidden;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.min-height-0 {
  min-height: 0 !important;
}
</style>
