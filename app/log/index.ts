import { createLogger } from 'bunyan';
import { getLogLevel } from '../configuration/index';

// Init Bunyan logger
export default createLogger({
    name: 'whats-up-docker',
    level: getLogLevel(),
});
