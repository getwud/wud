import { ref } from "vue";

// Global event bus using reactive refs
const events = ref({});

export function useEventBus() {
  const emit = (event, ...args) => {
    if (events.value[event]) {
      events.value[event].forEach((callback) => callback(...args));
    }
  };

  const on = (event, callback) => {
    if (!events.value[event]) {
      events.value[event] = [];
    }
    events.value[event].push(callback);
  };

  const off = (event, callback) => {
    if (events.value[event]) {
      const index = events.value[event].indexOf(callback);
      if (index > -1) {
        events.value[event].splice(index, 1);
      }
    }
  };

  return {
    emit,
    on,
    off,
  };
}
