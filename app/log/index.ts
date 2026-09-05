import pino from 'pino';
import { Writable } from 'stream';
import { EventEmitter } from 'events';
import { getLogLevel } from '../configuration';

export const logEmitter = new EventEmitter();
export const logHistory: any[] = [];
const MAX_HISTORY = 100;

const memoryStream = new Writable({
    write(chunk, encoding, callback) {
        const str = chunk.toString();
        const lines = str.split('\n').filter((l: string) => l.trim() !== '');
        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                logHistory.push(parsed);
                if (logHistory.length > MAX_HISTORY) {
                    logHistory.shift();
                }
                logEmitter.emit('log', parsed);
            } catch (e) {
                // Ignore unparseable lines
            }
        }
        callback();
    },
});

const streams = [{ stream: process.stdout }, { stream: memoryStream }];

// Init Pino logger
const logger = pino(
    {
        name: 'wud',
        level: getLogLevel(),
    },
    pino.multistream(streams),
);

export default logger;
