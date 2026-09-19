import { ref } from 'vue';

type ConnectionState = 'connected' | 'reconnecting' | 'offline';

class EventService {
    public connectionState = ref<ConnectionState>('offline');
    public lastEvent = ref<any>(null);
    private eventSource: EventSource | null = null;
    private handlers: Record<string, Array<(data: any) => void>> = {};

    constructor() {
        this.connect();
    }

    private connect() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        this.connectionState.value = 'reconnecting';
        this.eventSource = new EventSource('/api/events');

        this.eventSource.onopen = () => {
            this.connectionState.value = 'connected';
        };

        this.eventSource.onerror = () => {
            this.connectionState.value = 'offline';
            // Browser automatically reconnects EventSource, but we track state
        };

        this.eventSource.onmessage = (e) => {
            if (e.data === ': keepalive') return;
            try {
                const parsed = JSON.parse(e.data);
                this.lastEvent.value = parsed;
                if (parsed.type && this.handlers[parsed.type]) {
                    this.handlers[parsed.type].forEach(cb => cb(parsed.data));
                }
            } catch (err) {
                // ignore parse errors
            }
        };
    }

    public on(event: string, callback: (data: any) => void) {
        if (!this.handlers[event]) {
            this.handlers[event] = [];
        }
        this.handlers[event].push(callback);
    }

    public off(event: string, callback: (data: any) => void) {
        if (this.handlers[event]) {
            this.handlers[event] = this.handlers[event].filter(cb => cb !== callback);
        }
    }

    public reconnect() {
        this.connect();
    }
}

export const eventService = new EventService();
