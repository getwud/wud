import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { v5 as uuidV5 } from 'uuid';
import getmac from 'getmac';
import * as registry from '../registry';
import log from '../log';
import { getVersion } from '../configuration';
import SqliteSessionStore from './SqliteSessionStore';
import Authentication, {
    StrategyDescription,
} from '../authentications/providers/Authentication';
import { getUserById, countLocalUsers } from '../store/user';
import { verifyToken } from '../store/token';

const router = express.Router();

// The configured strategy ids.
const STRATEGY_IDS: string[] = [];

// Constant WUD namespace for uuid v5 bound sessions.
const WUD_NAMESPACE = 'dee41e92-5fc4-460e-beec-528c9ea7d760';

/**
 * Get all strategies id.
 */
export function getAllIds() {
    return STRATEGY_IDS;
}

/**
 * Express middleware to protect routes.
 */
export function requireAuthentication(req, res, next): any {
    if (req.isAuthenticated()) {
        return next();
    }
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return passport.authenticate('bearer', { session: false })(
            req,
            res,
            next,
        );
    }
    return passport.authenticate(getAllIds(), { session: true })(
        req,
        res,
        next,
    );
}

/**
 * Get cookie max age.
 */
function getCookieMaxAge(days: number) {
    return 3600 * 1000 * 24 * days;
}

/**
 * Get session secret key (bound to wud version).
 */
function getSessionSecretKey() {
    const stringToHash = `wud.${getVersion()}.${getmac()}`;
    return uuidV5(stringToHash, WUD_NAMESPACE);
}

/**
 * Register a strategy to passport.
 */
function useStrategy(authentication: Authentication, app) {
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

async function getUniqueStrategies() {
    const strategies = Object.values(registry.getState().authentication).map(
        (authentication) => authentication.getStrategyDescription(),
    );
    const uniqueStrategies: StrategyDescription[] = [];
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

    // If basic strategy is present, only expose it if there is at least one local user in the database
    const hasBasic = uniqueStrategies.find((s) => s.type === 'basic');
    if (hasBasic) {
        const localUserCount = await countLocalUsers();
        if (localUserCount === 0) {
            return uniqueStrategies
                .filter((s) => s.type !== 'basic')
                .sort((s1, s2) => s1.name.localeCompare(s2.name));
        }
    }

    return uniqueStrategies.sort((s1, s2) => s1.name.localeCompare(s2.name));
}

/**
 * Return the registered strategies from the registry.
 */
async function getStrategies(req, res) {
    res.json(await getUniqueStrategies());
}

async function getLogoutRedirectUrl() {
    const strategies = await getUniqueStrategies();
    const strategyWithRedirectUrl = strategies.find(
        (strategy) => strategy.logoutUrl,
    );
    if (strategyWithRedirectUrl) {
        return strategyWithRedirectUrl.logoutUrl;
    }
    return undefined;
}

/**
 * Get current user.
 */
function getUser(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { passwordHash, ...safeUser } = req.user;
    res.status(200).json(safeUser);
}

/**
 * Login user (and return it).
 */
function login(req, res) {
    return getUser(req, res);
}

/**
 * Logout current user.
 */
async function logout(req, res) {
    req.logout(() => {});
    res.status(200).json({
        logoutUrl: await getLogoutRedirectUrl(),
    });
}

let sessionStore: SqliteSessionStore | undefined;
/**
 * Init auth (passport.js).
 */
export function init(app) {
    sessionStore = new SqliteSessionStore();
    // Init express session
    app.use(
        session({
            store: sessionStore,
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

    // Register Bearer strategy for API Tokens
    passport.use(
        'bearer',
        new BearerStrategy(async (token, done) => {
            try {
                const result = await verifyToken(token);
                if (!result) {
                    return done(null, false);
                }
                const userWithToken = {
                    ...result.user,
                    token: result.token,
                };
                return done(null, userWithToken);
            } catch (err) {
                return done(err);
            }
        }),
    );

    // Register all authentications
    Object.values(registry.getState().authentication).forEach(
        (authentication) => useStrategy(authentication, app),
    );

    passport.serializeUser((user, done) => {
        done(null, JSON.stringify(user));
    });

    passport.deserializeUser(async (serialized: string, done) => {
        try {
            const parsed = JSON.parse(serialized);
            if (parsed.id) {
                const dbUser = await getUserById(parsed.id);
                if (dbUser) {
                    return done(null, {
                        id: dbUser.id,
                        username: dbUser.username,
                        role: dbUser.role,
                        provider: dbUser.provider,
                        preferences: dbUser.preferences,
                    });
                }
            }
            return done(null, parsed);
        } catch (e) {
            return done(e);
        }
    });

    // Return strategies
    router.get('/strategies', getStrategies);

    // Routes to protect after this line
    router.use(requireAuthentication);

    // Add login/logout routes
    router.post('/login', login);

    router.get('/user', getUser);

    router.post('/logout', logout);

    app.use('/auth', router);
}
