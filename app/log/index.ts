import pino from 'pino';
import { Writable } from 'stream';
import { EventEmitter } from 'events';
import { getLogLevel } from '../configuration';

export interface LogRecord {
    level: number;
    time: number;
    pid?: number;
    hostname?: string;
    name?: string;
    msg?: string;
    [key: string]: unknown;
}

export const logEmitter = new EventEmitter();
export const logHistory: LogRecord[] = [];
const MAX_HISTORY = 100;

export const memoryStream = new Writable({
    write(chunk, encoding, callback) {
        const str = chunk.toString();
        const lines = str.split('\n').filter((l: string) => l.trim() !== '');
        for (const line of lines) {
            try {
                const parsed = JSON.parse(line) as LogRecord;
                logHistory.push(parsed);
                if (logHistory.length > MAX_HISTORY) {
                    logHistory.shift();
                }
                logEmitter.emit('log', parsed);
            } catch {
                // Ignore unparseable lines
            }
        }
        callback();
    },
});

const logLevel = getLogLevel() as pino.LevelWithSilent;

const streams: pino.StreamEntry<pino.LevelWithSilent>[] = [
    { stream: process.stdout, level: logLevel },
    { stream: memoryStream, level: logLevel },
];

// Init Pino logger
const logger = pino(
    {
        name: 'wud',
        level: logLevel,
    },
    pino.multistream(streams),
);

export default logger;
