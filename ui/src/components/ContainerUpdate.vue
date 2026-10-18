<template>
  <div>
    <!-- Hero Block: Version Transition -->
    <v-card
      v-if="updateAvailable || isCoolingDown || isSnoozed || snoozedVersion"
      class="version-transition-hero mb-4 border"
      elevation="0"
      rounded="lg"
    >
      <div class="pa-4">
        <!-- Transition & Bump Badges -->
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
          <div class="d-flex align-center flex-wrap ga-2">
            <!-- Current version -->
            <div class="version-badge px-3 py-1 rounded border d-flex flex-column">
              <span class="text-caption text-medium-emphasis font-weight-medium">CURRENT</span>
              <span class="font-mono text-body-1 font-weight-bold">{{ currentVersionDisplay }}</span>
            </div>

            <!-- Transition Arrow -->
            <v-icon color="primary" size="22" class="mx-1">mdi-arrow-right-bold</v-icon>

            <!-- Target version -->
            <div class="version-badge px-3 py-1 rounded border d-flex flex-column">
              <div class="d-flex align-center">
                <span class="text-caption text-medium-emphasis font-weight-medium">TARGET</span>
                <v-tooltip text="Copy target tag" location="bottom">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-content-copy"
                      variant="text"
                      size="x-small"
                      class="ml-1"
                      @click="copyToClipboard('update tag', targetVersionDisplay)"
                      aria-label="Copy target tag"
                    ></v-btn>
                  </template>
                </v-tooltip>
              </div>
              <span class="font-mono text-body-1 font-weight-bold text-primary">{{ targetVersionDisplay }}</span>
            </div>

            <!-- Semantic Bump Badge & Semver Chip -->
            <div class="d-flex align-center ga-1 ml-sm-2">
              <v-chip
                v-if="bumpBadgeText"
                :color="bumpBadgeColor"
                size="small"
                variant="flat"
                class="font-weight-black text-uppercase"
              >
                {{ bumpBadgeText }}
              </v-chip>
              <v-chip
                v-if="semver"
                size="x-small"
                variant="outlined"
                color="success"
                label
                class="font-weight-bold"
              >
                semver
              </v-chip>
            </div>
          </div>
        </div>

        <!-- Integrated Status: Cool-down -->
        <v-alert
          v-if="isCoolingDown"
          color="info"
          variant="tonal"
          density="compact"
          icon="mdi-timer-sand"
          class="mt-3 mb-0"
          rounded="md"
        >
          <div class="font-weight-medium text-body-2">Update in cool-down</div>
          <div class="text-caption">
            A new version is available but currently held in cool-down period{{ coolingDownUntil ? ` until ${new Date(coolingDownUntil).toLocaleString()}` : '' }}.
          </div>
        </v-alert>

        <!-- Integrated Status: Snoozed -->
        <v-alert
          v-if="isSnoozed || snoozedVersion"
          color="warning"
          variant="tonal"
          density="compact"
          icon="mdi-bell-sleep"
          class="mt-3 mb-0"
          rounded="md"
        >
          <div class="font-weight-medium text-body-2">Update snoozed</div>
          <div class="text-caption">
            Version {{ snoozedVersion }} is snoozed{{ snoozedUntil ? ` until ${new Date(snoozedUntil).toLocaleString()}` : ' indefinitely' }}.
          </div>
        </v-alert>
      </div>

      <!-- Key Metadata Row -->
      <v-divider v-if="hasMetadata"></v-divider>
      <div v-if="hasMetadata" class="px-4 py-2 bg-surface-variant d-flex align-center flex-wrap ga-4 text-caption">
        <!-- Version -->
        <div v-if="result?.version" class="d-flex align-center">
          <v-icon size="16" class="mr-1 text-medium-emphasis">mdi-package-variant</v-icon>
          <span class="text-medium-emphasis mr-1">Version:</span>
          <span class="font-weight-bold font-mono">{{ result.version }}</span>
        </div>

        <!-- Built Date -->
        <div v-if="result?.created" class="d-flex align-center">
          <v-icon size="16" class="mr-1 text-medium-emphasis">mdi-calendar-clock</v-icon>
          <span class="text-medium-emphasis mr-1">Built:</span>
          <span class="font-weight-bold">{{ $filters.dateTime(result.created) }}</span>
        </div>

        <!-- Digest -->
        <div v-if="result?.digest" class="d-flex align-center">
          <v-icon size="16" class="mr-1 text-medium-emphasis">mdi-function-variant</v-icon>
          <span class="text-medium-emphasis mr-1">Digest:</span>
          <span class="font-mono mr-1" :title="result.digest">{{ shortDigest }}</span>
          <v-tooltip text="Copy digest" location="bottom">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-content-copy"
                variant="text"
                size="x-small"
                @click="copyToClipboard('update digest', result.digest)"
                aria-label="Copy digest"
              ></v-btn>
            </template>
          </v-tooltip>
        </div>

        <!-- External Link -->
        <div v-if="result?.link" class="d-flex align-center ml-auto">
          <v-btn
            :href="result.link"
            target="_blank"
            variant="text"
            size="x-small"
            color="primary"
            prepend-icon="mdi-open-in-new"
            class="px-1"
          >
            Release Link
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- Risk Analysis Card (positioned below Hero) -->
    <upgrade-risk-card
      v-if="updateAvailable || isCoolingDown || isSnoozed || snoozedVersion"
      :key="container?.id || containerId || result?.tag || 'risk-card'"
      :container="container || { result, id: containerId, updateKind }"
      :risk-analysis="effectiveRiskAnalysis"
      :is-unpaired="isUnpaired"
      :loading="riskLoading"
      @re-evaluate="reEvaluateRisk"
      @open-review="$emit('open-review', $event)"
    />

    <v-card-text v-else>No update available</v-card-text>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { copyToClipboard } from "@/services/clipboard";
import UpgradeRiskCard from "@/components/UpgradeRiskCard.vue";
import { evaluateContainerRisk } from "@/services/container";

export default defineComponent({
  components: {
    UpgradeRiskCard,
  },
  props: {
    container: {
      type: Object,
      default: null,
    },
    containerId: {
      type: String,
      default: "",
    },
    isUnpaired: {
      type: Boolean,
      default: false,
    },
    semver: {
      type: Boolean,
    },
    result: {
      type: Object,
    },
    updateKind: {
      type: Object,
    },
    updateAvailable: {
      type: Boolean,
    },
    isCoolingDown: {
      type: Boolean,
      default: false,
    },
    coolingDownUntil: {
      type: Number,
      default: null,
    },
    isSnoozed: {
      type: Boolean,
      default: false,
    },
    snoozedVersion: {
      type: String,
      default: "",
    },
    snoozedUntil: {
      type: Number,
      default: null,
    },
  },
  emits: ["risk-updated", "open-review"],
  data() {
    return {
      riskLoading: false,
      localRiskAnalysis: null as any,
    };
  },
  computed: {
    effectiveRiskAnalysis() {
      return (
        this.localRiskAnalysis ||
        this.result?.riskAnalysis ||
        this.container?.result?.riskAnalysis ||
        null
      );
    },
    currentVersionDisplay(): string {
      if (this.updateKind?.localValue) {
        return this.updateKind.localValue;
      }
      const imgTag = this.container?.image?.tag;
      if (imgTag && typeof imgTag === "object" && "value" in imgTag) {
        return String((imgTag as any).value || "");
      }
      if (typeof imgTag === "string") {
        return imgTag;
      }
      return this.container?.tag || "current";
    },
    targetVersionDisplay(): string {
      if (this.result?.tag) {
        return this.result.tag;
      }
      if (this.updateKind?.remoteValue) {
        return this.updateKind.remoteValue;
      }
      const resTag = this.container?.result?.tag;
      if (resTag && typeof resTag === "object" && "value" in resTag) {
        return String((resTag as any).value || "");
      }
      if (typeof resTag === "string") {
        return resTag;
      }
      if (this.result?.version) {
        return String(this.result.version);
      }
      return "target";
    },
    bumpType(): string {
      if (this.updateKind?.kind === "digest") {
        return "digest";
      }
      if (this.updateKind?.semverDiff) {
        return this.updateKind.semverDiff;
      }
      if (this.updateKind?.kind === "tag" && this.updateKind?.semverDiff) {
        return this.updateKind.semverDiff;
      }
      return "";
    },
    bumpBadgeColor(): string {
      switch (this.bumpType) {
        case "major":
          return "error";
        case "minor":
          return "warning";
        case "patch":
          return "success";
        case "digest":
          return "info";
        default:
          return "secondary";
      }
    },
    bumpBadgeText(): string {
      if (this.bumpType) {
        return this.bumpType.toUpperCase();
      }
      if (this.updateKindFormatted && this.updateKindFormatted !== "Unknown") {
        return this.updateKindFormatted.toUpperCase();
      }
      return "";
    },
    shortDigest(): string {
      const digest = this.result?.digest;
      if (!digest) return "";
      return digest.length > 19 ? `${digest.substring(0, 19)}...` : digest;
    },
    hasMetadata(): boolean {
      return Boolean(
        this.result?.version ||
        this.result?.created ||
        this.result?.digest ||
        this.result?.link
      );
    },
    updateKindFormatted(): string {
      let kind = "Unknown";
      if (this.updateKind) {
        kind = this.updateKind.kind;
      }
      if (this.updateKind?.semverDiff) {
        kind = this.updateKind.semverDiff;
      }
      return kind;
    },
  },
  watch: {
    "container.id"(newId?: string, oldId?: string) {
      if (newId !== oldId) {
        this.localRiskAnalysis = null;
      }
    },
    containerId(newId?: string, oldId?: string) {
      if (newId !== oldId) {
        this.localRiskAnalysis = null;
      }
    },
    container(newVal?: any, oldVal?: any) {
      if (newVal !== oldVal) {
        this.localRiskAnalysis = null;
      }
    },
    "result.tag"(newVal?: string, oldVal?: string) {
      if (newVal !== oldVal) {
        this.localRiskAnalysis = null;
      }
    },
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
    async reEvaluateRisk() {
      const id = this.container?.id || this.containerId;
      if (!id) return;
      this.riskLoading = true;
      try {
        const analysis = await evaluateContainerRisk(id, true);
        this.localRiskAnalysis = analysis;
        (this as any).$eventBus?.emit("notify", "Changelog risk analysis refreshed");
        this.$emit("risk-updated", { containerId: id, riskAnalysis: analysis });
      } catch (err: any) {
        (this as any).$eventBus?.emit(
          "notify",
          `Failed to refresh risk analysis: ${err.message}`,
          "error"
        );
      } finally {
        this.riskLoading = false;
      }
    },
  },
});
</script>

<style scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.version-transition-hero {
  border-radius: 8px;
  overflow: hidden;
}
.version-badge {
  background-color: rgba(var(--v-theme-surface-variant), 0.15);
}
</style>
