// @ts-nocheck
import express from 'express';
import session from 'express-session';
import ConnectLoki from 'connect-loki';
const LokiStore = ConnectLoki(session);
import passport from 'passport';
import { v5 as uuidV5 } from 'uuid';
import getmac from 'getmac';
import * as store from '../store';
import * as registry from '../registry';
import log from '../log';
import { getVersion } from '../configuration';

const router = express.Router();

// The configured strategy ids.
const STRATEGY_IDS = [];

// Constant WUD namespace for uuid v5 bound sessions.
const WUD_NAMESPACE = 'dee41e92-5fc4-460e-beec-528c9ea7d760';

/**
 * Get all strategies id.
 * @returns {[]}
 */
export function getAllIds() {
    return STRATEGY_IDS;
}

/**
 * Get cookie max age.
 * @param days
 * @returns {number}
 */
function getCookieMaxAge(days) {
    return 3600 * 1000 * 24 * days;
}

/**
 * Get session secret key (bound to wud version).
 * @returns {string}
 */
function getSessionSecretKey() {
    const stringToHash = `wud.${getVersion()}.${getmac()}`;
    return uuidV5(stringToHash, WUD_NAMESPACE);
}

/**
 * Register a strategy to passport.
 * @param authentication
 * @param app
 */
function useStrategy(authentication, app) {
    try {
        const strategy = authentication.getStrategy(app);
        passport.use(authentication.getId(), strategy);
        STRATEGY_IDS.push(authentication.getId());
    } catch (e) {
        log.warn(
            `Unable to apply authentication ${authentication.getId()} (${e.message})`,
        );
    }
}

function getUniqueStrategies() {
    const strategies = Object.values(registry.getState().authentication).map(
        (authentication) => authentication.getStrategyDescription(),
    );
    const uniqueStrategies = [];
    strategies.forEach((strategy) => {
        if (
            !uniqueStrategies.find(
                (item) =>
                    item.type === strategy.type && item.name === strategy.name,
            )
        ) {
            uniqueStrategies.push(strategy);
        }
    });
    return uniqueStrategies.sort((s1, s2) => s1.name.localeCompare(s2.name));
}

/**
 * Return the registered strategies from the registry.
 * @param req
 * @param res
 */
function getStrategies(req, res) {
    res.json(getUniqueStrategies());
}

function getLogoutRedirectUrl() {
    const strategyWithRedirectUrl = getUniqueStrategies().find(
        (strategy) => strategy.logoutUrl,
    );
    if (strategyWithRedirectUrl) {
        return strategyWithRedirectUrl.logoutUrl;
    }
    return undefined;
}

/**
 * Get current user.
 * @param req
 * @param res
 */
function getUser(req, res) {
    const user = req.user || { username: 'anonymous' };
    res.status(200).json(user);
}

/**
 * Login user (and return it).
 * @param req
 * @param res
 */
function login(req, res) {
    return getUser(req, res);
}

/**
 * Logout current user.
 * @param req
 * @param res
 */
function logout(req, res) {
    req.logout(() => {});
    res.status(200).json({
        logoutUrl: getLogoutRedirectUrl(),
    });
}

/**
 * Init auth (passport.js).
 * @returns {*}
 */
export function init(app) {
    // Init express session
    app.use(
        session({
            store: new LokiStore({
                path: `${store.getConfiguration().path}/${store.getConfiguration().file}`,
                ttl: 604800, // 7 days
            }),
            secret: getSessionSecretKey(),
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                maxAge: getCookieMaxAge(7),
            },
        }),
    );

    // Init passport middleware
    app.use(passport.initialize());
    app.use(passport.session());

    // Register all authentications
    Object.values(registry.getState().authentication).forEach(
        (authentication) => useStrategy(authentication, app),
    );

    passport.serializeUser((user, done) => {
        done(null, JSON.stringify(user));
    });

    passport.deserializeUser((user, done) => {
        done(null, JSON.parse(user));
    });

    // Return strategies
    router.get('/strategies', getStrategies);

    // Routes to protect after this line
    router.use(passport.authenticate(STRATEGY_IDS, { session: true }));

    // Add login/logout routes
    router.post('/login', login);

    router.get('/user', getUser);

    router.post('/logout', logout);

    app.use('/auth', router);
}
