import { loginBasic } from "@/services/auth";
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      username: "",
      password: "",
      rules: {
        required: (value: any) => !!value || "Required",
      },
    };
  },

  computed: {
    /**
     * Is form valid?
     * @returns {boolean}
     */
    valid() {
      return this.username !== "" && this.password !== "";
    },
  },

  methods: {
    /**
     * Perform login.
     * @returns {Promise<void>}
     */
    async login() {
      if (this.valid) {
        try {
          await loginBasic(this.username, this.password);
          this.$emit("authentication-success");
        } catch (e) {
          (this as any).$eventBus.emit("notify", "Username or password error", "error");
        }
      }
    },
  },
});
