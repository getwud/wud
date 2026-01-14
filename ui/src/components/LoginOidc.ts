import { getOidcRedirection } from "@/services/auth";
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  data() {
    return {};
  },

  methods: {
    /**
     * Perform login.
     * @returns {Promise<void>}
     */
    async redirect() {
      const redirection = await getOidcRedirection(this.name);
      window.location.href = redirection.url;
    },
  },
});
