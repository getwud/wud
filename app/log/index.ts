// @ts-nocheck
import bunyan from 'bunyan';
import { getLogLevel } from '../configuration';

// Init Bunyan logger
const logger = bunyan.createLogger({
    name: 'whats-up-docker',
    level: getLogLevel(),
});

export default logger;
