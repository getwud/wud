<template>
  <v-container fluid class="pa-4 h-100 d-flex flex-column">
    <!-- Top Toolbar with Title, Log Level, Search Filter & Controls -->
    <v-card class="border mb-3 flex-shrink-0" elevation="0" rounded="lg">
      <v-toolbar color="surface" density="compact" class="px-3 py-1">
        <v-icon :icon="logIcon" class="mr-2 text-primary" size="24"></v-icon>
        <div class="d-flex align-center mr-3">
          <span class="text-subtitle-1 font-weight-bold mr-2">Application Logs</span>
          <v-chip
            v-if="log.level"
            size="x-small"
            color="primary"
            variant="tonal"
            class="font-weight-bold text-uppercase"
          >
            Level: {{ log.level }}
          </v-chip>
        </div>

        <v-spacer></v-spacer>

        <!-- Search Input -->
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Filter logs..."
          density="compact"
          variant="outlined"
          hide-details
          clearable
          single-line
          class="mr-2 search-field"
          style="max-width: 260px;"
        ></v-text-field>

        <!-- Auto-scroll toggle -->
        <v-btn
          :icon="autoScroll ? 'mdi-arrow-down-bold' : 'mdi-arrow-down-bold-outline'"
          :color="autoScroll ? 'primary' : 'default'"
          variant="text"
          size="small"
          class="mr-1"
          @click="autoScroll = !autoScroll"
          :title="autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'"
        ></v-btn>

        <!-- Clear logs -->
        <v-btn
          icon="mdi-trash-can-outline"
          variant="text"
          size="small"
          @click="clearLogs"
          title="Clear display"
        ></v-btn>
      </v-toolbar>
    </v-card>

    <!-- Terminal / Logs Card -->
    <v-card class="border flex-grow-1 d-flex flex-column overflow-hidden" elevation="0" rounded="lg" style="background-color: #121212; min-height: 400px;">
      <!-- Terminal Header Info Bar -->
      <div class="d-flex align-center justify-space-between px-3 py-1 bg-surface border-b text-caption text-grey">
        <div class="d-flex align-center">
          <v-icon size="12" color="success" class="mr-2">mdi-circle</v-icon>
          <span>Live Stream (SSE)</span>
          <span class="ml-2 opacity-70">({{ filteredLogs.length }} lines)</span>
        </div>
        <div class="font-monospace text-caption">
          Buffer: {{ logLines.length }}
        </div>
      </div>

      <!-- Logs Container -->
      <v-card-text class="flex-grow-1 overflow-y-auto pa-3 font-monospace" ref="logContainer">
        <div v-if="filteredLogs.length === 0" class="text-center text-grey py-10">
          <v-icon size="36" class="mb-2 opacity-50">mdi-text-box-outline</v-icon>
          <div class="text-body-2" v-if="search">No logs match the filter</div>
          <div class="text-body-2" v-else>Waiting for incoming logs...</div>
        </div>

        <div
          v-for="(logLine, index) in filteredLogs"
          :key="index"
          class="d-flex align-start text-caption log-entry py-1"
        >
          <span class="text-grey mr-3 flex-shrink-0" style="width: 175px;">
            {{ formatDate(logLine.time) }}
          </span>
          <span
            :class="getLevelColor(logLine.level) + ' mr-2 font-weight-bold flex-shrink-0'"
            style="width: 50px;"
          >
            {{ getLevelName(logLine.level) }}
          </span>
          <span class="text-cyan-lighten-2 mr-3 flex-shrink-0 text-truncate" style="width: 130px;">
            [{{ logLine.component || 'core' }}]
          </span>
          <span class="text-white flex-grow-1" style="word-break: break-word; white-space: pre-wrap;">{{ logLine.msg }}</span>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { getLog, getLogIcon, streamLogs } from "@/services/log";
import { defineComponent } from "vue";

export default defineComponent({
  name: "LogsView",
  data() {
    return {
      log: {} as any,
      logLines: [] as any[],
      eventSource: null as any,
      search: "",
      autoScroll: true,
    };
  },

  computed: {
    logIcon(): string {
      return getLogIcon();
    },
    filteredLogs(): any[] {
      if (!this.search) return this.logLines;
      const q = this.search.toLowerCase();
      return this.logLines.filter((l: any) => {
        return (
          (l.msg && String(l.msg).toLowerCase().includes(q)) ||
          (l.component && String(l.component).toLowerCase().includes(q)) ||
          (l.level && this.getLevelName(l.level).toLowerCase().includes(q))
        );
      });
    },
  },

  mounted() {
    this.eventSource = streamLogs((logData) => {
      this.logLines.push(logData);

      if (this.autoScroll) {
        this.$nextTick(() => {
          const container = this.$refs.logContainer as HTMLElement;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
      }
    });
  },

  beforeUnmount() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  },

  methods: {
    clearLogs() {
      this.logLines = [];
    },
    formatDate(time: number) {
      if (!time) return "";
      const date = new Date(time);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      const millis = String(date.getMilliseconds()).padStart(3, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
    },
    getLevelName(level: number) {
      switch (level) {
        case 10: return "TRACE";
        case 20: return "DEBUG";
        case 30: return "INFO";
        case 40: return "WARN";
        case 50: return "ERROR";
        case 60: return "FATAL";
        default: return "INFO";
      }
    },
    getLevelColor(level: number) {
      switch (level) {
        case 10: return "text-grey";
        case 20: return "text-blue";
        case 30: return "text-green";
        case 40: return "text-yellow";
        case 50: return "text-red";
        case 60: return "text-purple";
        default: return "text-green";
      }
    },
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const log = await getLog();
      next((vm: any) => (vm.log = log));
    } catch (e: any) {
      next((vm: any) => {
        vm.$eventBus?.emit(
          "notify",
          `Error when trying to load the log configuration (${e.message})`,
          "error",
        );
      });
    }
  },
});
</script>

<style scoped>
.font-monospace {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.log-entry {
  line-height: 1.4;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}
.log-entry:hover {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
