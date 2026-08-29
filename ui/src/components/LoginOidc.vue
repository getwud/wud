<template>
  <v-form @keyup.enter="redirect">
    <v-card-text>
      <v-btn block color="primary" @click="redirect">
        <v-icon color="warning">mdi-openid</v-icon>
        &nbsp;Connect
      </v-btn>
    </v-card-text>
  </v-form>
</template>

<script lang="ts">
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
</script>
