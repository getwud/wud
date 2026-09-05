import { url } from "./base";
import { isDemoMode, mockService } from "./mock";

function getLogIcon() {
  return "mdi-bug";
}

async function getLog() {
  if (isDemoMode()) {
    return mockService.getLog();
  }
  const response = await fetch(url("api/log"), { credentials: "include" });
  return response.json();
}

function streamLogs(onMessage: (log: any) => void) {
  if (isDemoMode()) {
    // In demo mode, just push a fake log every few seconds
    const interval = setInterval(() => {
      onMessage({
        time: new Date().getTime(),
        level: 30,
        component: "demo",
        msg: "This is a demo log message",
      });
    }, 2000);
    return {
      close: () => clearInterval(interval),
    };
  }

  const eventSource = new EventSource(url("api/log/stream"), {
    withCredentials: true,
  });
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to parse log message", e);
    }
  };

  return eventSource;
}

export { getLogIcon, getLog, streamLogs };
