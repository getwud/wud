// @ts-nocheck
import * as component from './component';

export function getRegistries(req, res) {
    return component.getAll(req, res, 'registry');
}

export function getRegistry(req, res) {
    return component.getById(req, res, 'registry');
}

/**
 * Init Router.
 * @returns {*}
 */
export function init() {
    return component.init('registry');
}
