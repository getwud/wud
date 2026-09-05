import pino from 'pino';
import { getLogLevel } from '../configuration';

// Init Pino logger
const logger = pino({
    name: 'wud',
    level: getLogLevel(),
});

export default logger;
