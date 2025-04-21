declare module "pushover-notifications" {
    import { IncomingMessage } from "http";

    export interface PushoverOptions {
        token: string;
        user: string;
        httpOptions?: {
            proxy?: string;
            [key: string]: any;
        };
        debug?: boolean;
        onerror?: (error: Error | string, response?: IncomingMessage) => void;
        update_sounds?: boolean;
    }

    export interface SendMessageOptions {
        token?: string;
        user?: string;
        message: string;
        title?: string;
        device?: string;
        url?: string;
        html?: 0 | 1;
        expire?: number;
        retry?: number;
        ttl?: number;
        url_title?: string;
        priority?: number;
        timestamp?: number;
        sound?: string;
        file?: string | { name: string; data: Buffer; type?: string };
    }

    interface SoundList {
        [key: string]: string;
    }

    type SendCallback = (error: Error | null, data?: string, response?: IncomingMessage) => void;

    class Pushover {
        constructor(options: PushoverOptions);

        boundary: string;
        token: string;
        user: string;
        httpOptions?: PushoverOptions["httpOptions"];
        sounds: SoundList;
        debug?: boolean;
        onerror?: PushoverOptions["onerror"];

        send(message: SendMessageOptions, callback?: SendCallback): void;
        updateSounds(): void;
        errors(data: string | Error, response?: IncomingMessage): void;
    }

    export = Pushover;
}