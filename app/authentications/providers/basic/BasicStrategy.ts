import { BasicStrategy as HttpBasicStrategy } from 'passport-http';
import { Request } from 'express';

/**
 * Inherit from Basic Strategy including Session support.
 */
export class BasicStrategy extends HttpBasicStrategy {
    authenticate(req: Request) {
        // Already authenticated (thanks to session) => ok
        if (req.isAuthenticated()) {
            return (this as any).success(req.user);
        }
        return super.authenticate(req);
    }

    /**
     * Override challenge to avoid browser popup on 401 errrors.
     * @private
     */
    _challenge() {
        return 401;
    }
};
