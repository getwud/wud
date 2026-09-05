// @ts-nocheck
import * as component from './component';

export function getAuthentications(req, res) {
    return component.getAll(req, res, 'authentication');
}

export function getAuthentication(req, res) {
    return component.getById(req, res, 'authentication');
}
