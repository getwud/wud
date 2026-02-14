import { defineComponent } from "vue";

export default defineComponent({
  props: {
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
  },
  computed: {
    updateKindFormatted() {
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
  methods: {
    copyToClipboard(kind: string, value: string) {
      navigator.clipboard.writeText(value);
      (this as any).$eventBus.emit("notify", `${kind} copied to clipboard`);
    },
  },
});
