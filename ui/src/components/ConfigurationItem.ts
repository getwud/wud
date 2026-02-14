import IconRenderer from "@/components/IconRenderer.vue";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    IconRenderer,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      showDetail: false,
    };
  },
  computed: {
    configurationItems() {
      return Object.keys(this.item.configuration || [])
        .map((key) => ({
          key,
          value: this.item.configuration[key],
        }))
        .sort((item1, item2) => item1.key.localeCompare(item2.key));
    },

    displayName() {
      if (
        this.item.name &&
        this.item.type &&
        this.item.name !== this.item.type
      ) {
        return `${this.item.name} (${this.item.type})`;
      }
      if (this.item.name) {
        return this.item.name;
      }
      return "Unknown";
    },
  },

  methods: {
    collapse() {
      this.showDetail = !this.showDetail;
    },
    formatValue(value: any) {
      if (value === undefined || value === null || value === "") {
        return "<empty>";
      }
      return value;
    },
  },
});
