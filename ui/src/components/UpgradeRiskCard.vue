<template>
  <v-card class="upgrade-risk-card mb-4" variant="outlined">
    <!-- Unpaired / Teaser State -->
    <template v-if="isUnpaired">
      <v-card-item class="bg-surface-variant py-3">
        <template #prepend>
          <v-icon color="primary" class="mr-2">mdi-shield-lock-outline</v-icon>
        </template>
        <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
          Update Risk Analysis
          <v-chip color="primary" size="x-small" label class="ml-2">Hub Feature</v-chip>
        </v-card-title>
      </v-card-item>

      <v-card-text class="pt-4">
        <p class="text-body-2 mb-3">
          Eliminate upgrade surprises. Connect WUD Hub to automatically parse changelogs, highlight breaking changes, identify modified environment variables, and flag required database migrations.
        </p>

        <!-- Blurred Mock Preview -->
        <div class="teaser-preview pa-3 rounded mb-3">
          <div class="d-flex align-center mb-2">
            <RiskPill risk-score="high" size="small" />
            <span class="text-caption text-medium-emphasis ml-2">Sample Analysis Preview</span>
          </div>
          <div class="teaser-blur">
            <div class="text-body-2 font-weight-bold text-error mb-1">
              ⚠️ 2 breaking changes detected
            </div>
            <div class="text-caption text-medium-emphasis">
              • Incompatible database schema version requires manual backup and migration.<br />
              • Deprecated environment variable removed in favor of structured config.
            </div>
          </div>
        </div>

        <div class="d-flex align-center justify-space-between flex-wrap ga-2">
          <span class="text-caption text-medium-emphasis">
            Available with WUD Hub 14-day free trial.
          </span>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            to="/hub"
            prepend-icon="mdi-lightning-bolt"
          >
            Connect to WUD Hub
          </v-btn>
        </div>
      </v-card-text>
    </template>

    <!-- Paired State with Analysis Data -->
    <template v-else>
      <v-card-item class="py-3 bg-surface-variant">
        <template #prepend>
          <RiskPill :risk-score="currentRiskScore" :size="'small'" />
        </template>
        <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center flex-wrap ga-2">
          <span>Upgrade Risk Analysis</span>
          <v-chip
            v-if="analysis?.cached"
            size="x-small"
            variant="tonal"
            color="info"
            label
          >
            cached
          </v-chip>
          <span
            v-if="analysis?.evaluatedAt"
            class="text-caption text-medium-emphasis font-weight-regular ml-auto"
          >
            Evaluated {{ formattedEvaluatedAt }}
          </span>
        </v-card-title>
      </v-card-item>

      <v-divider />

      <v-card-text class="pt-3">
        <!-- Loading State -->
        <div v-if="loading" class="d-flex align-center justify-center py-4">
          <v-progress-circular indeterminate color="primary" size="24" class="mr-2" />
          <span class="text-body-2">Evaluating changelog risks via WUD Hub...</span>
        </div>

        <template v-else>
          <!-- Summary -->
          <div v-if="analysis?.summary" class="mb-3">
            <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
              EXECUTIVE SUMMARY
            </div>
            <p class="text-body-2 mb-0">{{ analysis.summary }}</p>
          </div>

          <!-- Database Impact Banner -->
          <v-alert
            v-if="analysis?.databaseImpact"
            type="warning"
            variant="tonal"
            density="compact"
            icon="mdi-database-alert"
            class="mb-3"
          >
            <div class="font-weight-medium text-body-2">Database & Storage Impact</div>
            <div class="text-caption">{{ analysis.databaseImpact }}</div>
          </v-alert>

          <!-- Breaking Changes List -->
          <div
            v-if="analysis?.breakingChanges && analysis.breakingChanges.length > 0"
            class="mb-3"
          >
            <div class="text-caption font-weight-bold text-error mb-1 d-flex align-center">
              <v-icon size="small" color="error" class="mr-1">mdi-alert-octagon</v-icon>
              BREAKING CHANGES ({{ analysis.breakingChanges.length }})
            </div>
            <v-list density="compact" class="bg-transparent pa-0">
              <v-list-item
                v-for="(item, idx) in analysis.breakingChanges"
                :key="idx"
                class="pa-0 min-height-0"
              >
                <div class="text-body-2 text-error-darken-1 d-flex align-start py-1">
                  <span class="mr-2">•</span>
                  <span>{{ item }}</span>
                </div>
              </v-list-item>
            </v-list>
          </div>

          <!-- Environment Variables Changes -->
          <div
            v-if="analysis?.envVarChanges && analysis.envVarChanges.length > 0"
            class="mb-3"
          >
            <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
              ENVIRONMENT VARIABLE CHANGES ({{ analysis.envVarChanges.length }})
            </div>
            <div class="env-changes-table rounded overflow-hidden">
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Change</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(env, idx) in analysis.envVarChanges" :key="idx">
                    <td class="font-weight-bold text-body-2 font-mono">
                      {{ env.name }}
                    </td>
                    <td>
                      <v-chip
                        :color="getEnvVarChipColor(env.type)"
                        size="x-small"
                        label
                        variant="flat"
                      >
                        {{ env.type }}
                      </v-chip>
                    </td>
                    <td class="text-caption">
                      {{ env.description }}
                      <span v-if="env.defaultValue" class="text-medium-emphasis">
                        (default: <code>{{ env.defaultValue }}</code>)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>

          <!-- Fallback when no risk data available -->
          <div
            v-if="!analysis && !loading"
            class="text-body-2 text-medium-emphasis py-2 text-center"
          >
            No changelog risk analysis available for this image tag yet.
          </div>
        </template>
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-4 py-2 bg-surface-variant d-flex align-center justify-space-between flex-wrap ga-2">
        <v-btn
          v-if="changelogUrl"
          :href="changelogUrl"
          target="_blank"
          variant="text"
          size="small"
          prepend-icon="mdi-open-in-new"
          color="secondary"
        >
          View Release Notes
        </v-btn>
        <span v-else></span>

        <v-btn
          variant="tonal"
          size="small"
          color="primary"
          :loading="reEvaluating"
          prepend-icon="mdi-refresh"
          @click="onReEvaluate"
        >
          Re-evaluate Risk
        </v-btn>
      </v-card-actions>
    </template>
  </v-card>
</template>

<script lang="ts">
import { defineComponent, computed, ref, PropType } from "vue";
import RiskPill from "./RiskPill.vue";

export interface EnvVarChange {
  name: string;
  type: "added" | "removed" | "modified" | "required" | "optional";
  description: string;
  defaultValue?: string;
}

export interface RiskAnalysisResult {
  riskScore: "low" | "medium" | "high" | "critical" | "unknown" | "unsupported";
  summary: string;
  breakingChanges: string[];
  envVarChanges: EnvVarChange[];
  databaseImpact: string | null;
  evaluatedAt: string;
  cached?: boolean;
}

export default defineComponent({
  name: "UpgradeRiskCard",
  components: {
    RiskPill,
  },
  props: {
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
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["re-evaluate"],
  setup(props, { emit }) {
    const reEvaluating = ref(false);

    const analysis = computed<RiskAnalysisResult | undefined>(() => {
      return props.riskAnalysis || props.container?.result?.riskAnalysis;
    });

    const currentRiskScore = computed(() => {
      return analysis.value?.riskScore || "unknown";
    });

    const changelogUrl = computed(() => {
      return (
        props.container?.result?.changelogUrl ||
        props.container?.result?.link ||
        props.container?.changelogUrl
      );
    });

    const formattedEvaluatedAt = computed(() => {
      if (!analysis.value?.evaluatedAt) return "";
      try {
        const d = new Date(analysis.value.evaluatedAt);
        return d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return analysis.value.evaluatedAt;
      }
    });

    function getEnvVarChipColor(type: string): string {
      switch (type) {
        case "removed":
        case "required":
          return "error";
        case "modified":
          return "warning";
        case "added":
          return "success";
        default:
          return "secondary";
      }
    }

    async function onReEvaluate() {
      reEvaluating.value = true;
      try {
        emit("re-evaluate", {
          containerId: props.container?.id,
          forceRefresh: true,
        });
      } finally {
        setTimeout(() => {
          reEvaluating.value = false;
        }, 600);
      }
    }

    return {
      analysis,
      currentRiskScore,
      changelogUrl,
      formattedEvaluatedAt,
      reEvaluating,
      getEnvVarChipColor,
      onReEvaluate,
    };
  },
});
</script>

<style scoped>
.upgrade-risk-card {
  border-radius: 8px;
  overflow: hidden;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.teaser-preview {
  background: rgba(0, 0, 0, 0.04);
  border: 1px dashed rgba(0, 0, 0, 0.15);
}
.teaser-blur {
  filter: blur(1.5px);
  user-select: none;
  opacity: 0.85;
}
.min-height-0 {
  min-height: 0 !important;
}
</style>
