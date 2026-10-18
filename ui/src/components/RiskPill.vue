<template>
  <div class="risk-pill-wrapper d-inline-flex align-center">
    <v-tooltip location="bottom">
      <template #activator="{ props: tooltipProps }">
        <v-chip
          v-bind="tooltipProps"
          :color="chipColor"
          :variant="chipVariant"
          :size="size"
          :class="['risk-pill', { 'cursor-pointer': isUnpaired || clickable }]"
          label
          @click="onClick"
        >
          <v-icon
            v-if="showIcon"
            start
            :size="iconSize"
            :class="{ 'mdi-spin': isPending }"
          >
            {{ chipIcon }}
          </v-icon>
          <span v-if="showText" class="font-weight-medium">
            {{ chipText }}
          </span>
        </v-chip>
      </template>
      <span>{{ tooltipText }}</span>
    </v-tooltip>

    <v-tooltip v-if="hasSkippedVersions" location="bottom">
      <template #activator="{ props: skippedTooltipProps }">
        <v-chip
          v-bind="skippedTooltipProps"
          :size="size"
          variant="tonal"
          color="secondary"
          class="skipped-pill ml-1 font-weight-medium"
          label
        >
          +{{ skippedVersionsCount }} {{ skippedVersionsCount === 1 ? 'version' : 'versions' }}
        </v-chip>
      </template>
      <span>Skipping {{ skippedVersionsCount }} intermediate {{ skippedVersionsCount === 1 ? 'version' : 'versions' }}</span>
    </v-tooltip>

    <v-btn
      v-if="showReviewButton"
      :size="size"
      variant="tonal"
      color="primary"
      class="ml-1 review-btn"
      prepend-icon="mdi-timeline-text-outline"
      @click="onReviewClick"
    >
      Review
    </v-btn>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from "vue";
import { useRouter } from "vue-router";

export type RiskScore =
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "unknown"
  | "unsupported"
  | "pending"
  | "locked";

export default defineComponent({
  name: "RiskPill",
  props: {
    riskScore: {
      type: String as PropType<RiskScore | string | null | undefined>,
      default: undefined,
    },
    skippedVersionsCount: {
      type: Number as PropType<number | null | undefined>,
      default: undefined,
    },
    isUnpaired: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: "small",
    },
    showIcon: {
      type: Boolean,
      default: true,
    },
    showText: {
      type: Boolean,
      default: true,
    },
    clickable: {
      type: Boolean,
      default: false,
    },
    showReviewButton: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["click", "open-review"],
  setup(props, { emit }) {
    const router = useRouter();

    const normalizedScore = computed<RiskScore>(() => {
      const score = props.riskScore?.toLowerCase();
      if (
        score === "low" ||
        score === "medium" ||
        score === "high" ||
        score === "critical" ||
        score === "pending" ||
        score === "unsupported" ||
        score === "locked"
      ) {
        return score as RiskScore;
      }
      return "unknown";
    });

    const isPending = computed(() => normalizedScore.value === "pending");

    const hasSkippedVersions = computed(() => {
      return (
        typeof props.skippedVersionsCount === "number" &&
        props.skippedVersionsCount > 0
      );
    });

    const chipColor = computed(() => {
      if (props.isUnpaired) {
        return "primary";
      }
      switch (normalizedScore.value) {
        case "low":
          return "success";
        case "medium":
          return "warning";
        case "high":
          return "deep-orange";
        case "critical":
          return "error";
        case "locked":
          return "primary";
        case "pending":
        case "unsupported":
        case "unknown":
        default:
          return "grey";
      }
    });

    const chipVariant = computed<"flat" | "tonal" | "outlined">(() => {
      if (props.isUnpaired) {
        return "tonal";
      }
      switch (normalizedScore.value) {
        case "critical":
        case "high":
          return "flat";
        case "low":
        case "medium":
        case "locked":
          return "tonal";
        case "pending":
        case "unsupported":
        case "unknown":
        default:
          return "outlined";
      }
    });

    const chipIcon = computed(() => {
      if (props.isUnpaired) {
        return "mdi-lock-outline";
      }
      switch (normalizedScore.value) {
        case "low":
          return "mdi-shield-check";
        case "medium":
          return "mdi-alert-circle-outline";
        case "high":
          return "mdi-alert-octagon-outline";
        case "critical":
          return "mdi-alert-decagram";
        case "locked":
          return "mdi-lock-outline";
        case "pending":
          return "mdi-loading";
        case "unsupported":
          return "mdi-help-circle-outline";
        case "unknown":
        default:
          return "mdi-shield-outline";
      }
    });

    const chipText = computed(() => {
      if (props.isUnpaired) {
        return "AI Risk Check";
      }
      switch (normalizedScore.value) {
        case "low":
          return "Low risk";
        case "medium":
          return "Medium risk";
        case "high":
          return "High risk";
        case "critical":
          return "Critical risk";
        case "locked":
          return "Locked";
        case "pending":
          return "Analyzing...";
        case "unsupported":
          return "Unsupported";
        case "unknown":
        default:
          return "Unknown risk";
      }
    });

    const tooltipText = computed(() => {
      if (props.isUnpaired) {
        return "Connect to WUD Hub to unlock AI-powered changelog risk analysis";
      }
      switch (normalizedScore.value) {
        case "low":
          return "Low risk — Routine update with no breaking changes identified";
        case "medium":
          return "Medium risk — Deprecations, minor config updates, or soft migrations";
        case "high":
          return "High risk — Breaking changes or manual intervention required";
        case "critical":
          return "Critical risk — Database format incompatible or removed mandatory variables";
        case "locked":
          return "Changelog risk analysis is locked — connect to WUD Hub or activate trial";
        case "pending":
          return "Risk analysis is currently in progress...";
        case "unsupported":
          return "Automated changelog analysis not supported for this source";
        case "unknown":
        default:
          return "No risk analysis available for this version";
      }
    });

    const iconSize = computed(() => (props.size === "x-small" ? 14 : 16));

    function onClick(e: MouseEvent) {
      if (props.isUnpaired) {
        if (router) {
          router.push("/hub");
        }
      }
      emit("click", e);
    }

    function onReviewClick(e: MouseEvent) {
      emit("open-review", e);
    }

    return {
      chipColor,
      chipVariant,
      chipIcon,
      chipText,
      tooltipText,
      iconSize,
      isPending,
      hasSkippedVersions,
      onClick,
      onReviewClick,
    };
  },
});
</script>

<style scoped>
.risk-pill-wrapper {
  vertical-align: middle;
}
.risk-pill {
  user-select: none;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
}
.skipped-pill {
  user-select: none;
  font-size: 0.75rem;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
