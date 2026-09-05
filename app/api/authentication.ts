// @ts-nocheck
import * as component from './component';

export function getAuthentications(req, res) {
    return component.getAll(req, res, 'authentication');
}

export function getAuthentication(req, res) {
    return component.getById(req, res, 'authentication');
}

/**
 * Init Router.
 * @returns {*}
 */
export function init() {
    return component.init('authentication');
}
